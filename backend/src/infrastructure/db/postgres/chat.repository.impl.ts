import type { Pool } from 'pg';
import type { ChatRepository } from '../../../domain/chat/chat.repository';
import type { Chat } from '../../../domain/chat/chat.entity';
import type { ChatMessage, PaginatedChatMessages } from '../../../domain/chat/chat-message.entity';

interface ChatRow {
  id: string;
  schedule_id: string;
  created_at: Date;
}

interface ChatMessageRow {
  id: string;
  chat_id: string;
  sender_user_id: string;
  content: string;
  // node-postgres는 timestamptz를 JS Date로 파싱하며 이 과정에서 마이크로초 이하
  // 정밀도가 밀리초로 잘린다. 이 잘린 값을 nextCursor나 ChatMessage.createdAt으로
  // 돌려주면, 그 값을 다음 폴링/페이지 요청의 cursor로 재사용할 때 원본 행의 실제
  // created_at(마이크로초 정밀도)이 잘린 커서보다 미세하게 커서 "created_at > cursor"
  // 조건에 그 행 자신이 다시 걸려 무한 반복 재수신되는 문제가 있었다(실측으로 발견,
  // 실시간 폴링에서는 매 응답마다 클라이언트가 즉시 재요청하므로 폭주로 이어진다).
  // to_char로 마이크로초까지 보존한 ISO 8601 문자열(cursor_value)을 커서와
  // createdAt 양쪽에 공통으로 사용해 이 문제를 없앤다.
  cursor_value: string;
}

function toChat(row: ChatRow): Chat {
  return { id: row.id, scheduleId: row.schedule_id, createdAt: row.created_at.toISOString() };
}

function toChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    chatId: row.chat_id,
    senderUserId: row.sender_user_id,
    content: row.content,
    createdAt: row.cursor_value,
  };
}

const CURSOR_VALUE_SQL = `to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export class PostgresChatRepository implements ChatRepository {
  constructor(private readonly pool: Pool) {}

  async findByScheduleId(scheduleId: string): Promise<Chat | null> {
    // uq_chats_schedule_id 유니크 인덱스로 단일 row를 즉시 찾는다(DB-6 검증 패턴).
    const result = await this.pool.query<ChatRow>(
      'SELECT id, schedule_id, created_at FROM chats WHERE schedule_id = $1',
      [scheduleId],
    );
    return result.rows[0] ? toChat(result.rows[0]) : null;
  }

  async createMessage(chatId: string, senderUserId: string, content: string): Promise<ChatMessage> {
    const result = await this.pool.query<ChatMessageRow>(
      `INSERT INTO chat_messages (chat_id, sender_user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, chat_id, sender_user_id, content, ${CURSOR_VALUE_SQL} AS cursor_value`,
      [chatId, senderUserId, content],
    );
    return toChatMessage(result.rows[0]);
  }

  async listMessages(
    chatId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedChatMessages> {
    // DB-6(#9)에서 검증된 ix_chat_messages_chat_id_created_at 복합 인덱스를 사용하는
    // 쿼리 패턴을 그대로 재사용한다. limit+1건을 가져와 다음 페이지 존재 여부를 판단한다.
    // cursor는 원본 정밀도를 보존한 텍스트 값이며, Postgres가 timestamptz로 그대로
    // 캐스팅해 비교한다(위 ChatMessageRow.cursor_value 주석 참조).
    const result = cursor
      ? await this.pool.query<ChatMessageRow>(
          `SELECT id, chat_id, sender_user_id, content, ${CURSOR_VALUE_SQL} AS cursor_value
           FROM chat_messages
           WHERE chat_id = $1 AND created_at > $2::timestamptz
           ORDER BY created_at ASC
           LIMIT $3`,
          [chatId, cursor, limit + 1],
        )
      : await this.pool.query<ChatMessageRow>(
          `SELECT id, chat_id, sender_user_id, content, ${CURSOR_VALUE_SQL} AS cursor_value
           FROM chat_messages
           WHERE chat_id = $1
           ORDER BY created_at ASC
           LIMIT $2`,
          [chatId, limit + 1],
        );

    const hasMore = result.rows.length > limit;
    const pageRows = hasMore ? result.rows.slice(0, limit) : result.rows;
    const data = pageRows.map(toChatMessage);
    const nextCursor = hasMore ? pageRows[pageRows.length - 1].cursor_value : null;

    return { data, nextCursor, hasMore };
  }
}

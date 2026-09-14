import type { Chat } from './chat.entity';
import type { ChatMessage, PaginatedChatMessages } from './chat-message.entity';

// 인터페이스만 정의(docs/4-project-structure.md 2.2절) — 구현은 infrastructure에 위치.
// REST(BE-6, list-chat-history.usecase.ts)와 WebSocket(BE-8, send-chat-message.usecase.ts)이
// 동일한 저장소를 공유해야 WS로 보낸 메시지가 REST 조회로도 동일하게 나타난다.
export interface ChatRepository {
  // 일정이 소프트 삭제되어도 조회 가능해야 하므로(SC2) deleted_at 여부를 따지지 않는다.
  findByScheduleId(scheduleId: string): Promise<Chat | null>;
  createMessage(chatId: string, senderUserId: string, content: string): Promise<ChatMessage>;
  // cursor가 null이면 첫 페이지(가장 오래된 메시지부터)를 반환한다.
  listMessages(
    chatId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedChatMessages>;
}

// chat_messages 테이블 대응(database/schema.sql). swagger.json ChatMessage/
// PaginatedChatMessages 스키마와 필드명을 맞춘다.

export interface ChatMessage {
  id: string;
  chatId: string;
  senderUserId: string;
  content: string;
  createdAt: string;
}

// UC8 커서 기반 페이지네이션 응답(ix_chat_messages_chat_id_created_at 인덱스 기반, 시간순).
export interface PaginatedChatMessages {
  data: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

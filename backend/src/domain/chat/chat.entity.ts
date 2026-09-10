// chats 테이블 대응(database/schema.sql) — 일정 1:1 채팅 관계(도메인정의서 6장)를 표현한다.
// 메시지(chat_messages)에 대응하는 ChatMessage 타입은 BE-6에서 추가된다.

export interface Chat {
  id: string;
  scheduleId: string;
  createdAt: string;
}

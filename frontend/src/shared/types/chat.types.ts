export interface Chat {
  id: string;
  scheduleId: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderUserId: string;
  content: string;
  createdAt: string;
}

export interface PaginatedChatMessages {
  data: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ChatSocketJoinFrame {
  type: 'join';
  scheduleId: string;
}

export interface ChatSocketSendFrame {
  type: 'message';
  scheduleId: string;
  content: string;
}

export type ChatSocketClientFrame = ChatSocketJoinFrame | ChatSocketSendFrame;

export interface ChatSocketMessageEvent {
  type: 'message';
  message: ChatMessage;
}

export interface ChatSocketErrorEvent {
  type: 'error';
  code: string;
  message: string;
}

export type ChatSocketServerFrame = ChatSocketMessageEvent | ChatSocketErrorEvent;

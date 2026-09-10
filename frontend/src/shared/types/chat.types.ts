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

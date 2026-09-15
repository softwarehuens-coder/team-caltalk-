import { get, post } from '../../../shared/api/http-client';
import type { ChatMessage, PaginatedChatMessages } from '../../../shared/types/chat.types';

export interface GetScheduleMessagesParams {
  cursor?: string;
  limit?: number;
}

export function getScheduleMessages(
  scheduleId: string,
  params?: GetScheduleMessagesParams,
): Promise<PaginatedChatMessages> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set('cursor', params.cursor);
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  const queryString = query.toString();
  return get<PaginatedChatMessages>(`/schedules/${scheduleId}/messages${queryString ? `?${queryString}` : ''}`);
}

export interface PollScheduleMessagesParams {
  cursor: string | null;
  timeoutMs?: number;
}

// UC5 실시간 수신(롱폴링). cursor 이후 새 메시지가 생길 때까지 서버가 최대
// timeoutMs만큼 대기하다 응답한다(use-chat-polling.ts가 응답을 받는 즉시 반복 호출).
export function pollScheduleMessages(
  scheduleId: string,
  params: PollScheduleMessagesParams,
): Promise<PaginatedChatMessages> {
  const query = new URLSearchParams();
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.timeoutMs !== undefined) query.set('timeout', String(params.timeoutMs));
  const queryString = query.toString();
  return get<PaginatedChatMessages>(
    `/schedules/${scheduleId}/messages/poll${queryString ? `?${queryString}` : ''}`,
  );
}

// UC5 실시간 송신.
export function sendScheduleMessage(scheduleId: string, content: string): Promise<ChatMessage> {
  return post<ChatMessage>(`/schedules/${scheduleId}/messages`, { content });
}

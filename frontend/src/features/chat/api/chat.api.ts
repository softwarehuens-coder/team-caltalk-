import { get } from '../../../shared/api/http-client';
import type { PaginatedChatMessages } from '../../../shared/types/chat.types';

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

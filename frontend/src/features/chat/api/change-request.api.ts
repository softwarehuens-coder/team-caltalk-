import { get, post } from '../../../shared/api/http-client';
import type {
  ChangeRequest,
  SubmitChangeRequestRequest,
  RejectChangeRequestRequest,
} from '../../../shared/types/change-request.types';

export function submitChangeRequest(
  scheduleId: string,
  body: SubmitChangeRequestRequest,
): Promise<ChangeRequest> {
  return post<ChangeRequest>(`/schedules/${scheduleId}/change-requests`, body);
}

export function listChangeRequests(scheduleId: string): Promise<ChangeRequest[]> {
  return get<ChangeRequest[]>(`/schedules/${scheduleId}/change-requests`);
}

export function approveChangeRequest(id: string): Promise<ChangeRequest> {
  return post<ChangeRequest>(`/change-requests/${id}/approve`);
}

export function rejectChangeRequest(
  id: string,
  body: RejectChangeRequestRequest,
): Promise<ChangeRequest> {
  return post<ChangeRequest>(`/change-requests/${id}/reject`, body);
}

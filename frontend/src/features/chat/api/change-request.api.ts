import { post } from '../../../shared/api/http-client';
import type { ChangeRequest, SubmitChangeRequestRequest } from '../../../shared/types/change-request.types';

export function submitChangeRequest(
  scheduleId: string,
  body: SubmitChangeRequestRequest,
): Promise<ChangeRequest> {
  return post<ChangeRequest>(`/schedules/${scheduleId}/change-requests`, body);
}

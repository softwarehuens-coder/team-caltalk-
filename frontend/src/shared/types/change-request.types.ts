export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ChangeRequest {
  id: string;
  scheduleId: string;
  requestedByUserId: string;
  status: ChangeRequestStatus;
  desiredStartAt: string;
  desiredEndAt: string;
  reason: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface SubmitChangeRequestRequest {
  desiredStartAt: string;
  desiredEndAt: string;
  reason?: string | null;
}

export interface RejectChangeRequestRequest {
  reason: string;
}

// change_requests 테이블 대응(database/schema.sql). swagger.json ChangeRequest/
// ChangeRequestStatus 스키마와 필드명을 맞춘다.

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

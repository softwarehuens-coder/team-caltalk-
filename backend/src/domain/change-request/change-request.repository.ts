import type { ChangeRequest } from './change-request.entity';
import type { Schedule } from '../schedule/schedule.entity';

export interface CreateChangeRequestInput {
  scheduleId: string;
  requestedByUserId: string;
  desiredStartAt: string;
  desiredEndAt: string;
  reason: string | null;
}

export interface ApprovedResult {
  changeRequest: ChangeRequest;
  schedule: Schedule;
}

// 인터페이스만 정의(docs/4-project-structure.md 2.2절) — 구현은 infrastructure에 위치.
export interface ChangeRequestRepository {
  create(input: CreateChangeRequestInput): Promise<ChangeRequest>;
  findById(changeRequestId: string): Promise<ChangeRequest | null>;
  // status가 PENDING이 아니면 null을 반환한다(호출부가 409로 매핑).
  // "change_requests.status를 APPROVED로" + "대상 schedules 갱신"을 단일 트랜잭션
  // 안에서 원자적으로 처리한다(SC3, CLAUDE.md 도메인 불변조건).
  approve(changeRequestId: string): Promise<ApprovedResult | null>;
  // status가 PENDING이 아니면 null을 반환한다. 원본 schedules는 절대 갱신하지 않는다.
  // 거절 사유(reason)는 change_requests.reason 컬럼에 반영하지 않는다 — swagger.json
  // ChangeRequest.reason 설명대로 이 컬럼은 "제출 시 입력한 사유"용이며, 거절 사유는
  // 해당 일정 채팅의 통지 메시지로만 기록된다(application 계층 책임).
  reject(changeRequestId: string): Promise<ChangeRequest | null>;
}

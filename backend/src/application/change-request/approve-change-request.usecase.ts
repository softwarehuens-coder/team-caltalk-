import type { TeamRepository } from '../../domain/team/team.repository';
import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import type { ChangeRequestRepository } from '../../domain/change-request/change-request.repository';
import type { ChatRepository } from '../../domain/chat/chat.repository';
import type { ChangeRequest } from '../../domain/change-request/change-request.entity';
import { canApproveChangeRequest } from '../../domain/permission/permission.policy';
import { NotFoundError, ForbiddenError, ConflictError } from '../../domain/shared/http-errors';

export interface ApproveChangeRequestInput {
  changeRequestId: string;
  actorUserId: string;
}

// UC7, SC3 핵심 지점. status→APPROVED와 schedules 갱신의 원자성 자체는
// change-request.repository.ts의 approve() 트랜잭션이 보장한다(docs/4-project-structure.md
// 4.3절 코드 리뷰 필수 대상). 이 유스케이스는 권한 판단(canApproveChangeRequest SSOT)과
// 승인 완료 후 채팅 통지만 조율한다 — 승인 전에는 원본 schedules를 절대 건드리지 않는다.
export async function approveChangeRequest(
  teamRepository: TeamRepository,
  scheduleRepository: ScheduleRepository,
  changeRequestRepository: ChangeRequestRepository,
  chatRepository: ChatRepository,
  input: ApproveChangeRequestInput,
): Promise<ChangeRequest> {
  const changeRequest = await changeRequestRepository.findById(input.changeRequestId);
  if (!changeRequest) {
    throw new NotFoundError('CHANGE_REQUEST_NOT_FOUND', '변경 요청을 찾을 수 없습니다.');
  }

  const schedule = await scheduleRepository.findById(changeRequest.scheduleId);
  if (!schedule) {
    throw new NotFoundError('SCHEDULE_NOT_FOUND', '일정을 찾을 수 없습니다.');
  }

  const membership = await teamRepository.findMembership(schedule.teamId, input.actorUserId);
  if (!canApproveChangeRequest(membership?.role ?? null)) {
    throw new ForbiddenError('FORBIDDEN', '변경 요청을 승인할 권한이 없습니다.');
  }

  const result = await changeRequestRepository.approve(input.changeRequestId);
  if (!result) {
    throw new ConflictError('NOT_PENDING', '이미 결정된 변경 요청입니다.');
  }

  const chat = await chatRepository.findByScheduleId(changeRequest.scheduleId);
  if (chat) {
    await chatRepository.createMessage(
      chat.id,
      input.actorUserId,
      '변경 요청이 승인되어 일정이 갱신되었습니다.',
    );
  }

  return result.changeRequest;
}

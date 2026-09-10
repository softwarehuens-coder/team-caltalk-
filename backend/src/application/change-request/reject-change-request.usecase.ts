import type { TeamRepository } from '../../domain/team/team.repository';
import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import type { ChangeRequestRepository } from '../../domain/change-request/change-request.repository';
import type { ChatRepository } from '../../domain/chat/chat.repository';
import type { ChangeRequest } from '../../domain/change-request/change-request.entity';
import { canRejectChangeRequest } from '../../domain/permission/permission.policy';
import { NotFoundError, ForbiddenError, ConflictError } from '../../domain/shared/http-errors';

export interface RejectChangeRequestInput {
  changeRequestId: string;
  actorUserId: string;
  reason: string;
}

// UC7. status만 REJECTED로 갱신하고 원본 schedules는 절대 변경하지 않는다
// (change-request.repository.ts의 reject() 참조). 거절 사유는 change_requests.reason
// 컬럼에 반영되지 않고 채팅 통지 메시지로만 기록된다(swagger.json ChangeRequest.reason 설명).
export async function rejectChangeRequest(
  teamRepository: TeamRepository,
  scheduleRepository: ScheduleRepository,
  changeRequestRepository: ChangeRequestRepository,
  chatRepository: ChatRepository,
  input: RejectChangeRequestInput,
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
  if (!canRejectChangeRequest(membership?.role ?? null)) {
    throw new ForbiddenError('FORBIDDEN', '변경 요청을 거절할 권한이 없습니다.');
  }

  const rejected = await changeRequestRepository.reject(input.changeRequestId);
  if (!rejected) {
    throw new ConflictError('NOT_PENDING', '이미 결정된 변경 요청입니다.');
  }

  const chat = await chatRepository.findByScheduleId(changeRequest.scheduleId);
  if (chat) {
    await chatRepository.createMessage(
      chat.id,
      input.actorUserId,
      `변경 요청이 거절되었습니다. 사유: ${input.reason}`,
    );
  }

  return rejected;
}

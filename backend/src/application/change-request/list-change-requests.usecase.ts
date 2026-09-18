import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import type { TeamRepository } from '../../domain/team/team.repository';
import type { ChangeRequestRepository } from '../../domain/change-request/change-request.repository';
import type { ChangeRequest } from '../../domain/change-request/change-request.entity';
import { canAccessScheduleChat } from '../../domain/permission/permission.policy';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';

export interface ListChangeRequestsInput {
  scheduleId: string;
  actorUserId: string;
}

// 제출자 탭의 로컬 state에만 남는 문제(팀장이 새로고침/재접속 시 대기중 요청을
// 영원히 볼 수 없는 버그)를 해결하기 위해 추가. list-chat-history.usecase.ts와
// 동일하게 canAccessScheduleChat(팀장은 항상, 팀원은 해당 일정 참여자여야 열람 가능)을
// 사용한다.
export async function listChangeRequests(
  scheduleRepository: ScheduleRepository,
  teamRepository: TeamRepository,
  changeRequestRepository: ChangeRequestRepository,
  input: ListChangeRequestsInput,
): Promise<ChangeRequest[]> {
  const schedule = await scheduleRepository.findById(input.scheduleId);
  if (!schedule) {
    throw new NotFoundError('SCHEDULE_NOT_FOUND', '일정을 찾을 수 없습니다.');
  }

  const membership = await teamRepository.findMembership(schedule.teamId, input.actorUserId);
  const isParticipant = schedule.participants.some((p) => p.userId === input.actorUserId);
  if (!canAccessScheduleChat(membership?.role ?? null, isParticipant)) {
    throw new ForbiddenError('FORBIDDEN', '해당 일정의 변경 요청을 조회할 권한이 없습니다.');
  }

  return changeRequestRepository.listBySchedule(input.scheduleId);
}

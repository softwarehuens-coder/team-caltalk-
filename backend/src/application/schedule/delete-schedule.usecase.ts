import type { TeamRepository } from '../../domain/team/team.repository';
import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import { canEditSchedule } from '../../domain/permission/permission.policy';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';

export interface DeleteScheduleInput {
  teamId: string;
  scheduleId: string;
  actorUserId: string;
}

// UC3, SC2. LEADER만 삭제 가능. ScheduleRepository에는 소프트 삭제 메서드만
// 존재하므로(schedule.repository.ts 참조) 이 경로로는 채팅 이력 CASCADE가
// 구조적으로 발생할 수 없다.
export async function deleteSchedule(
  teamRepository: TeamRepository,
  scheduleRepository: ScheduleRepository,
  input: DeleteScheduleInput,
): Promise<void> {
  const team = await teamRepository.findById(input.teamId);
  if (!team) {
    throw new NotFoundError('TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
  }

  const membership = await teamRepository.findMembership(input.teamId, input.actorUserId);
  if (!canEditSchedule(membership?.role ?? null)) {
    throw new ForbiddenError('FORBIDDEN', '일정을 삭제할 권한이 없습니다.');
  }

  const deleted = await scheduleRepository.softDelete(input.teamId, input.scheduleId);
  if (!deleted) {
    throw new NotFoundError('SCHEDULE_NOT_FOUND', '일정을 찾을 수 없습니다.');
  }
}

import type { TeamRepository } from '../../domain/team/team.repository';
import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import type { Schedule } from '../../domain/schedule/schedule.entity';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';

export interface ListTeamSchedulesInput {
  teamId: string;
  actorUserId: string;
}

// UC2/UC4, SC1. view/date는 라우트가 요청 형식 검증에만 쓰고 이 유스케이스에는
// 전달하지 않는다 — ScheduleRepository.listActiveByTeam이 teamId만 받는 타입이라
// 기간으로 조회를 제한할 방법 자체가 없다(SC1 불변조건, schedule.repository.ts 참조).
export async function listTeamSchedules(
  teamRepository: TeamRepository,
  scheduleRepository: ScheduleRepository,
  input: ListTeamSchedulesInput,
): Promise<Schedule[]> {
  const team = await teamRepository.findById(input.teamId);
  if (!team) {
    throw new NotFoundError('TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
  }

  const membership = await teamRepository.findMembership(input.teamId, input.actorUserId);
  if (!membership) {
    throw new ForbiddenError('FORBIDDEN', '해당 팀의 구성원만 조회할 수 있습니다.');
  }

  return scheduleRepository.listActiveByTeam(input.teamId);
}

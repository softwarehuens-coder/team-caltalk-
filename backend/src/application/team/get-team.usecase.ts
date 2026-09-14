import type { TeamRepository } from '../../domain/team/team.repository';
import type { Team } from '../../domain/team/team.entity';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';

export interface GetTeamInput {
  teamId: string;
  actorUserId: string;
}

// 가입 요청이 승인된 뒤 팀 이름을 알 방법이 없던 문제(FE-2)를 해결하기 위해 추가.
// list-team-members.usecase.ts와 동일하게 팀 소속 사용자만 조회 가능하다.
export async function getTeam(teamRepository: TeamRepository, input: GetTeamInput): Promise<Team> {
  const team = await teamRepository.findById(input.teamId);
  if (!team) {
    throw new NotFoundError('TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
  }

  const actorMembership = await teamRepository.findMembership(input.teamId, input.actorUserId);
  if (!actorMembership) {
    throw new ForbiddenError('FORBIDDEN', '해당 팀의 구성원만 조회할 수 있습니다.');
  }

  return team;
}

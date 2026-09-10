import type { TeamRepository } from '../../domain/team/team.repository';
import type { TeamMembership } from '../../domain/team/team.entity';
import { NotFoundError, ConflictError } from '../../domain/shared/http-errors';

export interface JoinTeamInput {
  teamId: string;
  userId: string;
}

// UC-팀원 가입(도메인정의서 5장). 이미 소속된 사용자의 재가입은 409로 막는다.
export async function joinTeam(
  teamRepository: TeamRepository,
  input: JoinTeamInput,
): Promise<TeamMembership> {
  const team = await teamRepository.findById(input.teamId);
  if (!team) {
    throw new NotFoundError('TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
  }

  const existing = await teamRepository.findMembership(input.teamId, input.userId);
  if (existing) {
    throw new ConflictError('ALREADY_MEMBER', '이미 해당 팀에 소속되어 있습니다.');
  }

  return teamRepository.addMember(input.teamId, input.userId, 'MEMBER');
}

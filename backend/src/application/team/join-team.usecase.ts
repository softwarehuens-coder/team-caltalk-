import type { TeamRepository } from '../../domain/team/team.repository';
import type { TeamJoinRequest } from '../../domain/team/team.entity';
import { NotFoundError, ConflictError } from '../../domain/shared/http-errors';

export interface JoinTeamInput {
  teamId: string;
  userId: string;
}

// UC-팀원 가입 요청. 요청만 생성하며, 팀장의 승인 전에는 멤버십을 만들지 않는다.
export async function joinTeam(
  teamRepository: TeamRepository,
  input: JoinTeamInput,
): Promise<TeamJoinRequest> {
  const team = await teamRepository.findById(input.teamId);
  if (!team) {
    throw new NotFoundError('TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
  }

  const existing = await teamRepository.findMembership(input.teamId, input.userId);
  if (existing) {
    throw new ConflictError('ALREADY_MEMBER', '이미 해당 팀에 소속되어 있습니다.');
  }

  return teamRepository.createJoinRequest(input.teamId, input.userId);
}

import type { TeamRepository } from '../../domain/team/team.repository';
import type { TeamMember } from '../../domain/team/team.entity';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';

export interface ListTeamMembersInput {
  teamId: string;
  actorUserId: string;
}

// GET /teams/{teamId}/members — 팀 소속 사용자만 조회 가능(팀장/팀원 공통).
export async function listTeamMembers(
  teamRepository: TeamRepository,
  input: ListTeamMembersInput,
): Promise<TeamMember[]> {
  const team = await teamRepository.findById(input.teamId);
  if (!team) {
    throw new NotFoundError('TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
  }

  const actorMembership = await teamRepository.findMembership(input.teamId, input.actorUserId);
  if (!actorMembership) {
    throw new ForbiddenError('FORBIDDEN', '해당 팀의 구성원만 조회할 수 있습니다.');
  }

  return teamRepository.listMembers(input.teamId);
}

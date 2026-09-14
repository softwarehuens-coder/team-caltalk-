import type { TeamJoinRequest } from '../../domain/team/team.entity';
import type { TeamRepository } from '../../domain/team/team.repository';
import { canApproveTeamJoin } from '../../domain/permission/permission.policy';
import { ForbiddenError, NotFoundError } from '../../domain/shared/http-errors';

export async function listPendingJoinRequests(
  teamRepository: TeamRepository,
  input: { teamId: string; actorUserId: string },
): Promise<TeamJoinRequest[]> {
  const team = await teamRepository.findById(input.teamId);
  if (!team) throw new NotFoundError('TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');

  const membership = await teamRepository.findMembership(input.teamId, input.actorUserId);
  if (!canApproveTeamJoin(membership?.role ?? null)) {
    throw new ForbiddenError('FORBIDDEN', '가입 요청을 조회할 권한이 없습니다.');
  }
  return teamRepository.listPendingJoinRequests(input.teamId);
}

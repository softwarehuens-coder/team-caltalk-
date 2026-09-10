import type { TeamRepository } from '../../domain/team/team.repository';
import { determineLeaveOutcome } from '../../domain/team/team-lifecycle.rules';
import { NotFoundError, ConflictError } from '../../domain/shared/http-errors';

export interface LeaveTeamInput {
  teamId: string;
  userId: string;
}

export interface LeaveTeamResult {
  teamId: string;
  teamDissolved: boolean;
}

// UC-팀 탈퇴/팀 해체(도메인정의서 5장). 판정 자체는 순수 함수(team-lifecycle.rules)에
// 위임하고, 이 유스케이스는 그 결과에 따라 멤버십 삭제 또는 팀 전체 삭제(CASCADE)를 실행한다.
export async function leaveTeam(
  teamRepository: TeamRepository,
  input: LeaveTeamInput,
): Promise<LeaveTeamResult> {
  const team = await teamRepository.findById(input.teamId);
  if (!team) {
    throw new NotFoundError('TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
  }

  const membership = await teamRepository.findMembership(input.teamId, input.userId);
  if (!membership) {
    throw new NotFoundError('NOT_A_MEMBER', '해당 팀의 구성원이 아닙니다.');
  }

  const memberCount = await teamRepository.countMembers(input.teamId);
  const outcome = determineLeaveOutcome(membership.role, memberCount);

  if (!outcome.allowed) {
    throw new ConflictError(
      'LEADER_MUST_DELEGATE_FIRST',
      '팀장은 위임 없이 탈퇴할 수 없습니다. 먼저 다른 팀원에게 팀장을 위임하세요.',
    );
  }

  if (outcome.teamDissolved) {
    await teamRepository.deleteTeam(input.teamId);
  } else {
    await teamRepository.removeMember(input.teamId, input.userId);
  }

  return { teamId: input.teamId, teamDissolved: outcome.teamDissolved };
}

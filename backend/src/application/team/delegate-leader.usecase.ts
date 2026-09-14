import type { TeamRepository } from '../../domain/team/team.repository';
import type { TeamMembership } from '../../domain/team/team.entity';
import { canDelegateLeader } from '../../domain/permission/permission.policy';
import { isEligibleForLeadership } from '../../domain/team/team-lifecycle.rules';
import { ForbiddenError, ConflictError } from '../../domain/shared/http-errors';

export interface DelegateLeaderInput {
  teamId: string;
  actorUserId: string;
  newLeaderUserId: string;
}

// UC-팀장 위임(도메인정의서 5장, 영구 이전·회수 불가). 현재 LEADER만 수행 가능하며,
// 대상은 해당 팀의 기존 MEMBER여야 한다. "정확히 1명의 팀장" 불변조건은
// team.repository.ts의 transferLeadership 트랜잭션이 보장한다.
export async function delegateLeader(
  teamRepository: TeamRepository,
  input: DelegateLeaderInput,
): Promise<TeamMembership[]> {
  const actorMembership = await teamRepository.findMembership(input.teamId, input.actorUserId);
  if (!canDelegateLeader(actorMembership?.role ?? null)) {
    throw new ForbiddenError('FORBIDDEN', '팀장 위임 권한이 없습니다.');
  }

  const targetMembership = await teamRepository.findMembership(input.teamId, input.newLeaderUserId);
  if (!isEligibleForLeadership(targetMembership?.role ?? null)) {
    throw new ConflictError(
      'INELIGIBLE_LEADERSHIP_TARGET',
      '위임 대상은 해당 팀의 기존 구성원(MEMBER)이어야 합니다.',
    );
  }

  return teamRepository.transferLeadership(input.teamId, input.actorUserId, input.newLeaderUserId);
}

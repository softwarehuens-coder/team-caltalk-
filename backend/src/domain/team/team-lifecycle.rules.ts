import type { TeamRole } from '../permission/permission.policy';

// docs/1-domain-definition.md 5장 "팀 라이프사이클"의 순수 판정 로직.
// 실제 DB 갱신(멤버십 삭제, 팀 삭제, 역할 UPDATE)은 application/infrastructure의
// 몫이며, 이 모듈은 "어떤 결과가 되어야 하는가"만 판단한다.

export interface LeaveOutcome {
  allowed: boolean;
  teamDissolved: boolean;
}

// 5장 "팀 해체": 위임 없는 유일한 팀장의 탈퇴는 불허(409)한다. 유일한 팀원인
// 팀장이 탈퇴하면 팀이 해체된다(teamDissolved=true). 팀원의 탈퇴는 항상 허용된다.
export function determineLeaveOutcome(actorRole: TeamRole, memberCount: number): LeaveOutcome {
  if (actorRole === 'MEMBER') {
    return { allowed: true, teamDissolved: false };
  }
  if (memberCount === 1) {
    return { allowed: true, teamDissolved: true };
  }
  return { allowed: false, teamDissolved: false };
}

// 5장 "팀장 위임": 위임 대상은 반드시 해당 팀에 이미 소속된 MEMBER여야 한다
// (팀 미소속이거나 이미 LEADER인 대상은 위임 자격이 없다).
export function isEligibleForLeadership(targetRole: TeamRole | null): boolean {
  return targetRole === 'MEMBER';
}

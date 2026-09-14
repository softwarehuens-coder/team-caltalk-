import { describe, it, expect } from 'vitest';
import {
  canEditSchedule,
  canInviteTeamMember,
  canDelegateLeader,
  canApproveChangeRequest,
  canRejectChangeRequest,
  canSubmitChangeRequest,
  canAccessTeamChat,
} from '../../../../src/domain/permission/permission.policy';

// docs/1-domain-definition.md 4장 권한 표를 그대로 검증한다.
// LEADER: 조회 가능, 쓰기 가능, 변경요청 발신 불가, 승인/거절 가능
// MEMBER: 조회 가능, 쓰기 불가, 변경요청 발신 가능, 승인/거절 불가
// 둘 다: 채팅 접근 가능

describe('permission.policy — LEADER 전용 함수', () => {
  const leaderOnlyFns: Array<(role: 'LEADER' | 'MEMBER' | null) => boolean> = [
    canEditSchedule,
    canInviteTeamMember,
    canDelegateLeader,
    canApproveChangeRequest,
    canRejectChangeRequest,
  ];

  for (const fn of leaderOnlyFns) {
    it(`${fn.name}: LEADER는 true, MEMBER/null은 false`, () => {
      expect(fn('LEADER')).toBe(true);
      expect(fn('MEMBER')).toBe(false);
      expect(fn(null)).toBe(false);
    });
  }
});

describe('canSubmitChangeRequest — MEMBER 전용', () => {
  it('MEMBER는 true, LEADER/null은 false', () => {
    expect(canSubmitChangeRequest('MEMBER')).toBe(true);
    expect(canSubmitChangeRequest('LEADER')).toBe(false);
    expect(canSubmitChangeRequest(null)).toBe(false);
  });
});

describe('canAccessTeamChat — 팀 소속 여부만 확인', () => {
  it('LEADER/MEMBER 모두 true, 미소속(null)은 false', () => {
    expect(canAccessTeamChat('LEADER')).toBe(true);
    expect(canAccessTeamChat('MEMBER')).toBe(true);
    expect(canAccessTeamChat(null)).toBe(false);
  });
});

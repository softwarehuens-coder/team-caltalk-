import { describe, it, expect } from 'vitest';
import {
  canEditSchedule,
  canInviteTeamMember,
  canDelegateLeader,
  canApproveChangeRequest,
  canRejectChangeRequest,
  canSubmitChangeRequest,
  canAccessScheduleChat,
} from '../../../../src/domain/permission/permission.policy';

// docs/1-domain-definition.md 4장 권한 표를 그대로 검증한다.
// LEADER: 조회 가능, 쓰기 가능, 변경요청 발신 불가, 승인/거절 가능
// MEMBER: 조회 가능, 쓰기 불가, 변경요청 발신 가능, 승인/거절 불가
// 채팅: 팀장은 항상 접근 가능, 팀원은 해당 일정 참여자여야 접근 가능(2026-09-18 정책 변경)

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

describe('canAccessScheduleChat — 팀장은 항상, 팀원은 참여자여야 접근 가능', () => {
  it('LEADER는 참여자 여부와 무관하게 항상 true', () => {
    expect(canAccessScheduleChat('LEADER', true)).toBe(true);
    expect(canAccessScheduleChat('LEADER', false)).toBe(true);
  });

  it('MEMBER는 참여자일 때만 true', () => {
    expect(canAccessScheduleChat('MEMBER', true)).toBe(true);
    expect(canAccessScheduleChat('MEMBER', false)).toBe(false);
  });

  it('미소속(null)은 참여자 여부와 무관하게 항상 false', () => {
    expect(canAccessScheduleChat(null, true)).toBe(false);
    expect(canAccessScheduleChat(null, false)).toBe(false);
  });
});

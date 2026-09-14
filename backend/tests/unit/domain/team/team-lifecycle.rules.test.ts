import { describe, it, expect } from 'vitest';
import {
  determineLeaveOutcome,
  isEligibleForLeadership,
} from '../../../../src/domain/team/team-lifecycle.rules';

describe('determineLeaveOutcome', () => {
  it('MEMBER는 인원수와 무관하게 항상 허용되고 팀은 해체되지 않는다', () => {
    expect(determineLeaveOutcome('MEMBER', 5)).toEqual({ allowed: true, teamDissolved: false });
    expect(determineLeaveOutcome('MEMBER', 1)).toEqual({ allowed: true, teamDissolved: false });
  });

  it('LEADER가 유일한 구성원이면 탈퇴 허용 + 팀 해체', () => {
    expect(determineLeaveOutcome('LEADER', 1)).toEqual({ allowed: true, teamDissolved: true });
  });

  it('LEADER인데 다른 구성원이 남아있으면 위임 없는 탈퇴는 불허(409)', () => {
    expect(determineLeaveOutcome('LEADER', 2)).toEqual({ allowed: false, teamDissolved: false });
    expect(determineLeaveOutcome('LEADER', 5)).toEqual({ allowed: false, teamDissolved: false });
  });
});

describe('isEligibleForLeadership', () => {
  it('MEMBER만 위임 대상 자격이 있다', () => {
    expect(isEligibleForLeadership('MEMBER')).toBe(true);
    expect(isEligibleForLeadership('LEADER')).toBe(false);
    expect(isEligibleForLeadership(null)).toBe(false);
  });
});

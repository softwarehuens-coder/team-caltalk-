import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ScheduleConflictWarning } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';
import { useScheduleConflicts } from './use-schedule-conflicts';

describe('useScheduleConflicts', () => {
  const members: TeamMember[] = [
    { userId: 'u1', email: 'user1@test.com', name: '홍길동', role: 'LEADER', joinedAt: '2026-01-01T00:00:00.000Z' },
    { userId: 'u2', email: 'user2@test.com', name: '김철수', role: 'MEMBER', joinedAt: '2026-01-02T00:00:00.000Z' },
  ];

  it('warnings가 빈 배열이면 hasConflicts는 false이고 formattedWarnings도 빈 배열이다', () => {
    const { result } = renderHook(() => useScheduleConflicts([], members));

    expect(result.current.hasConflicts).toBe(false);
    expect(result.current.formattedWarnings).toEqual([]);
  });

  it('warnings가 존재하면 hasConflicts는 true이고 올바르게 가공된 경고 메시지를 반환한다', () => {
    const warnings: ScheduleConflictWarning[] = [
      {
        conflictingScheduleId: 's2',
        conflictingUserId: 'u2',
        conflictingScheduleTitle: '고객사 미팅',
      },
    ];

    const { result } = renderHook(() => useScheduleConflicts(warnings, members));

    expect(result.current.hasConflicts).toBe(true);
    expect(result.current.formattedWarnings).toEqual([
      '김철수님이 참여하는 "고객사 미팅" 일정과 시간이 겹칩니다.',
    ]);
  });

  it('경고 대상 사용자가 members에 없을 경우 알 수 없는 사용자로 표시한다', () => {
    const warnings: ScheduleConflictWarning[] = [
      {
        conflictingScheduleId: 's2',
        conflictingUserId: 'u999',
        conflictingScheduleTitle: '고객사 미팅',
      },
    ];

    const { result } = renderHook(() => useScheduleConflicts(warnings, members));

    expect(result.current.hasConflicts).toBe(true);
    expect(result.current.formattedWarnings).toEqual([
      '알 수 없는 사용자님이 참여하는 "고객사 미팅" 일정과 시간이 겹칩니다.',
    ]);
  });
});

import { describe, it, expect } from 'vitest';
import { detectScheduleConflicts } from '../../../../src/domain/schedule/schedule-conflict';

const EXISTING = {
  id: 'existing-1',
  title: '고객사 미팅',
  startAt: '2026-09-15T14:00:00.000Z',
  endAt: '2026-09-15T15:00:00.000Z',
  participantUserIds: ['seoyeon'],
};

describe('detectScheduleConflicts', () => {
  it('시간이 겹치고 참여자도 겹치면 경고를 반환한다(US-06)', () => {
    const warnings = detectScheduleConflicts(
      {
        startAt: '2026-09-15T14:30:00.000Z',
        endAt: '2026-09-15T15:30:00.000Z',
        participantUserIds: ['seoyeon'],
      },
      [EXISTING],
    );
    expect(warnings).toEqual([
      {
        conflictingScheduleId: 'existing-1',
        conflictingUserId: 'seoyeon',
        conflictingScheduleTitle: '고객사 미팅',
      },
    ]);
  });

  it('시간이 겹쳐도 참여자가 겹치지 않으면 경고 없음', () => {
    const warnings = detectScheduleConflicts(
      {
        startAt: '2026-09-15T14:30:00.000Z',
        endAt: '2026-09-15T15:30:00.000Z',
        participantUserIds: ['minjun'],
      },
      [EXISTING],
    );
    expect(warnings).toEqual([]);
  });

  it('참여자가 겹쳐도 시간이 겹치지 않으면 경고 없음(맞닿는 경계 포함, US-06 마지막 단계)', () => {
    const warnings = detectScheduleConflicts(
      {
        startAt: '2026-09-15T15:30:00.000Z',
        endAt: '2026-09-15T16:30:00.000Z',
        participantUserIds: ['seoyeon'],
      },
      [EXISTING],
    );
    expect(warnings).toEqual([]);
  });

  it('일정이 정확히 맞닿는 경우(한쪽 종료 시각 = 다른쪽 시작 시각)는 겹침이 아니다', () => {
    const warnings = detectScheduleConflicts(
      {
        startAt: '2026-09-15T15:00:00.000Z',
        endAt: '2026-09-15T16:00:00.000Z',
        participantUserIds: ['seoyeon'],
      },
      [EXISTING],
    );
    expect(warnings).toEqual([]);
  });

  it('여러 일정과 겹치면 각각에 대해 경고를 반환한다', () => {
    const other = { ...EXISTING, id: 'existing-2', title: '다른 회의' };
    const warnings = detectScheduleConflicts(
      {
        startAt: '2026-09-15T14:00:00.000Z',
        endAt: '2026-09-15T15:00:00.000Z',
        participantUserIds: ['seoyeon'],
      },
      [EXISTING, other],
    );
    expect(warnings).toHaveLength(2);
  });

  it('경고가 있어도 함수는 예외를 던지지 않고 값을 반환한다(SC4 — 저장을 차단하지 않음을 전제)', () => {
    expect(() =>
      detectScheduleConflicts(
        {
          startAt: '2026-09-15T14:30:00.000Z',
          endAt: '2026-09-15T15:30:00.000Z',
          participantUserIds: ['seoyeon'],
        },
        [EXISTING],
      ),
    ).not.toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import type { Schedule } from '../../../shared/types/schedule.types';
import { groupSchedulesByDay } from './schedule-period.util';

function buildSchedule(overrides: Partial<Schedule>): Schedule {
  return {
    id: 's1',
    teamId: 't1',
    title: '일정',
    startAt: '2026-04-15T01:00:00.000Z',
    endAt: '2026-04-15T02:00:00.000Z',
    createdAt: '2026-04-01T00:00:00.000Z',
    deletedAt: null,
    participants: [],
    ...overrides,
  };
}

describe('groupSchedulesByDay', () => {
  it('전달된 days 각각을 key로 갖는 Map을 생성하고 startAt 기준으로 일정을 버킷팅한다', () => {
    const days = [new Date(2026, 3, 15), new Date(2026, 3, 16)];
    const scheduleOn15 = buildSchedule({ id: 's1', startAt: new Date(2026, 3, 15, 9).toISOString() });
    const scheduleOn16 = buildSchedule({ id: 's2', startAt: new Date(2026, 3, 16, 9).toISOString() });

    const result = groupSchedulesByDay([scheduleOn15, scheduleOn16], days);

    expect(result.get('2026-04-15')).toEqual([scheduleOn15]);
    expect(result.get('2026-04-16')).toEqual([scheduleOn16]);
  });

  it('days에 포함되지 않은 날짜의 일정은 결과에 담기지 않는다', () => {
    const days = [new Date(2026, 3, 15)];
    const outOfRange = buildSchedule({ id: 's1', startAt: new Date(2026, 3, 20, 9).toISOString() });

    const result = groupSchedulesByDay([outOfRange], days);

    expect(result.get('2026-04-15')).toEqual([]);
  });

  it('일정이 없는 날짜는 빈 배열을 가진 key로 유지된다', () => {
    const days = [new Date(2026, 3, 15), new Date(2026, 3, 16)];

    const result = groupSchedulesByDay([], days);

    expect(result.get('2026-04-15')).toEqual([]);
    expect(result.get('2026-04-16')).toEqual([]);
  });

  it('deletedAt이 설정된 일정은 결과에서 제외된다(방어적 필터링)', () => {
    const days = [new Date(2026, 3, 15)];
    const deleted = buildSchedule({ id: 's1', deletedAt: '2026-04-10T00:00:00.000Z' });

    const result = groupSchedulesByDay([deleted], days);

    expect(result.get('2026-04-15')).toEqual([]);
  });
});

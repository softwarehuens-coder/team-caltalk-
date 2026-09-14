import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '../../../shared/api/api-error';
import type { Schedule } from '../../../shared/types/schedule.types';
import type { CalendarViewMode } from '../types/calendar-view.types';

const getTeamSchedulesMock = vi.fn();

vi.mock('../api/schedule.api', () => ({
  getTeamSchedules: (...args: unknown[]) => getTeamSchedulesMock(...args),
}));

import { useTeamSchedules } from './use-team-schedules';

function buildSchedule(id: string): Schedule {
  return {
    id,
    teamId: 't1',
    title: '일정',
    startAt: '2026-04-15T01:00:00.000Z',
    endAt: '2026-04-15T02:00:00.000Z',
    createdAt: '2026-04-01T00:00:00.000Z',
    deletedAt: null,
    participants: [],
  };
}

afterEach(() => {
  getTeamSchedulesMock.mockReset();
});

describe('useTeamSchedules', () => {
  it('teamId가 null이면 getTeamSchedules를 호출하지 않고 schedules는 빈 배열이다', () => {
    const { result } = renderHook(() => useTeamSchedules(null, 'month', '2026-04-15'));

    expect(getTeamSchedulesMock).not.toHaveBeenCalled();
    expect(result.current.schedules).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('마운트 시 teamId/view/date로 getTeamSchedules를 호출하고 성공하면 schedules를 채운다', async () => {
    const schedules = [buildSchedule('s1')];
    getTeamSchedulesMock.mockResolvedValue(schedules);

    const { result } = renderHook(() => useTeamSchedules('t1', 'month', '2026-04-15'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(getTeamSchedulesMock).toHaveBeenCalledWith('t1', { view: 'month', date: '2026-04-15' });
    expect(result.current.schedules).toEqual(schedules);
    expect(result.current.error).toBeNull();
  });

  it('조회가 403으로 실패하면 error에 ApiError를 저장한다', async () => {
    const error = new ApiError(403, 'NOT_MEMBER', '팀 멤버가 아닙니다');
    getTeamSchedulesMock.mockRejectedValue(error);

    const { result } = renderHook(() => useTeamSchedules('t1', 'month', '2026-04-15'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBe(error);
    expect(result.current.schedules).toEqual([]);
  });

  it('view 또는 date가 변경되면 getTeamSchedules를 다시 호출한다', async () => {
    getTeamSchedulesMock.mockResolvedValue([]);

    const { rerender } = renderHook(
      ({ view, date }) => useTeamSchedules('t1', view, date),
      { initialProps: { view: 'month' as CalendarViewMode, date: '2026-04-15' } },
    );

    await waitFor(() => {
      expect(getTeamSchedulesMock).toHaveBeenCalledTimes(1);
    });

    rerender({ view: 'week' as CalendarViewMode, date: '2026-04-12' });

    await waitFor(() => {
      expect(getTeamSchedulesMock).toHaveBeenCalledTimes(2);
    });
    expect(getTeamSchedulesMock).toHaveBeenLastCalledWith('t1', { view: 'week', date: '2026-04-12' });
  });

  it('refresh 호출 시 getTeamSchedules를 다시 호출하고 최신 결과로 갱신한다', async () => {
    const initial = [buildSchedule('s1')];
    const updated = [buildSchedule('s1'), buildSchedule('s2')];
    getTeamSchedulesMock.mockResolvedValueOnce(initial).mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useTeamSchedules('t1', 'month', '2026-04-15'));

    await waitFor(() => {
      expect(result.current.schedules).toEqual(initial);
    });

    await result.current.refresh();

    await waitFor(() => {
      expect(result.current.schedules).toEqual(updated);
    });
    expect(getTeamSchedulesMock).toHaveBeenCalledTimes(2);
  });
});

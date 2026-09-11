import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/api-error';
import type { Schedule } from '../../../shared/types/schedule.types';

const getMock = vi.fn();

vi.mock('../../../shared/api/http-client', () => ({
  get: (...args: unknown[]) => getMock(...args),
}));

import { getTeamSchedules } from './schedule.api';

afterEach(() => {
  getMock.mockReset();
});

describe('getTeamSchedules', () => {
  it('GET /teams/{teamId}/schedules 를 view/date 쿼리와 함께 호출하고 일정 목록을 반환한다', async () => {
    const schedules: Schedule[] = [
      {
        id: 's1',
        teamId: 't1',
        title: '주간 회의',
        startAt: '2026-04-15T01:00:00.000Z',
        endAt: '2026-04-15T02:00:00.000Z',
        createdAt: '2026-04-01T00:00:00.000Z',
        deletedAt: null,
        participants: [],
      },
    ];
    getMock.mockResolvedValue(schedules);

    const result = await getTeamSchedules('t1', { view: 'month', date: '2026-04-15' });

    expect(getMock).toHaveBeenCalledWith('/teams/t1/schedules?view=month&date=2026-04-15');
    expect(result).toEqual(schedules);
  });

  it('get이 ApiError로 실패하면(403) 그대로 전파한다', async () => {
    const error = new ApiError(403, 'NOT_MEMBER', '팀 멤버가 아닙니다');
    getMock.mockRejectedValue(error);

    await expect(getTeamSchedules('t1', { view: 'week', date: '2026-04-15' })).rejects.toBe(error);
  });
});

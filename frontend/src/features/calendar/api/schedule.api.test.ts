import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/api-error';
import type {
  CreateScheduleRequest,
  Schedule,
  ScheduleCreateResponse,
  UpdateScheduleRequest,
} from '../../../shared/types/schedule.types';

const getMock = vi.fn();
const postMock = vi.fn();
const putMock = vi.fn();
const delMock = vi.fn();

vi.mock('../../../shared/api/http-client', () => ({
  get: (...args: unknown[]) => getMock(...args),
  post: (...args: unknown[]) => postMock(...args),
  put: (...args: unknown[]) => putMock(...args),
  del: (...args: unknown[]) => delMock(...args),
}));

import { createSchedule, deleteSchedule, getTeamSchedules, updateSchedule } from './schedule.api';

afterEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  putMock.mockReset();
  delMock.mockReset();
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

describe('createSchedule', () => {
  const requestBody: CreateScheduleRequest = {
    title: '주간 회의',
    startAt: '2026-04-15T01:00:00.000Z',
    endAt: '2026-04-15T02:00:00.000Z',
    participantUserIds: ['u2'],
  };

  it('POST /teams/{teamId}/schedules 를 호출하고 생성된 일정과 충돌 경고를 반환한다', async () => {
    const response: ScheduleCreateResponse = {
      schedule: {
        id: 's1',
        teamId: 't1',
        title: '주간 회의',
        startAt: '2026-04-15T01:00:00.000Z',
        endAt: '2026-04-15T02:00:00.000Z',
        createdAt: '2026-04-01T00:00:00.000Z',
        deletedAt: null,
        participants: [],
      },
      conflictWarnings: [],
    };
    postMock.mockResolvedValue(response);

    const result = await createSchedule('t1', requestBody);

    expect(postMock).toHaveBeenCalledWith('/teams/t1/schedules', requestBody);
    expect(result).toEqual(response);
  });

  it('post가 ApiError로 실패하면(403) 그대로 전파한다', async () => {
    const error = new ApiError(403, 'NOT_LEADER', '팀장만 일정을 생성할 수 있습니다');
    postMock.mockRejectedValue(error);

    await expect(createSchedule('t1', requestBody)).rejects.toBe(error);
  });
});

describe('updateSchedule', () => {
  const requestBody: UpdateScheduleRequest = {
    title: '주간 회의(변경)',
    startAt: '2026-04-15T03:00:00.000Z',
    endAt: '2026-04-15T04:00:00.000Z',
    participantUserIds: ['u2', 'u3'],
  };

  it('PUT /teams/{teamId}/schedules/{scheduleId} 를 호출하고 수정된 일정과 충돌 경고를 반환한다', async () => {
    const response: ScheduleCreateResponse = {
      schedule: {
        id: 's1',
        teamId: 't1',
        title: '주간 회의(변경)',
        startAt: '2026-04-15T03:00:00.000Z',
        endAt: '2026-04-15T04:00:00.000Z',
        createdAt: '2026-04-01T00:00:00.000Z',
        deletedAt: null,
        participants: [],
      },
      conflictWarnings: [],
    };
    putMock.mockResolvedValue(response);

    const result = await updateSchedule('t1', 's1', requestBody);

    expect(putMock).toHaveBeenCalledWith('/teams/t1/schedules/s1', requestBody);
    expect(result).toEqual(response);
  });

  it('put이 ApiError로 실패하면(403) 그대로 전파한다', async () => {
    const error = new ApiError(403, 'NOT_LEADER', '팀장만 일정을 수정할 수 있습니다');
    putMock.mockRejectedValue(error);

    await expect(updateSchedule('t1', 's1', requestBody)).rejects.toBe(error);
  });
});

describe('deleteSchedule', () => {
  it('DELETE /teams/{teamId}/schedules/{scheduleId} 를 호출한다', async () => {
    delMock.mockResolvedValue(undefined);

    await deleteSchedule('t1', 's1');

    expect(delMock).toHaveBeenCalledWith('/teams/t1/schedules/s1');
  });

  it('del이 ApiError로 실패하면(403) 그대로 전파한다', async () => {
    const error = new ApiError(403, 'NOT_LEADER', '팀장만 일정을 삭제할 수 있습니다');
    delMock.mockRejectedValue(error);

    await expect(deleteSchedule('t1', 's1')).rejects.toBe(error);
  });
});

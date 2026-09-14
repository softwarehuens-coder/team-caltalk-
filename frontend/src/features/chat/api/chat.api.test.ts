import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/api-error';
import type { PaginatedChatMessages } from '../../../shared/types/chat.types';

const getMock = vi.fn();

vi.mock('../../../shared/api/http-client', () => ({
  get: (...args: unknown[]) => getMock(...args),
}));

import { getScheduleMessages } from './chat.api';

afterEach(() => {
  getMock.mockReset();
});

function buildPage(overrides: Partial<PaginatedChatMessages> = {}): PaginatedChatMessages {
  return {
    data: [
      {
        id: 'm1',
        chatId: 'c1',
        senderUserId: 'u2',
        content: '안녕하세요',
        createdAt: '2026-04-01T00:00:00.000Z',
      },
    ],
    nextCursor: null,
    hasMore: false,
    ...overrides,
  };
}

describe('getScheduleMessages', () => {
  it('cursor/limit이 없으면 쿼리 없이 GET /schedules/{scheduleId}/messages 를 호출한다', async () => {
    const page = buildPage();
    getMock.mockResolvedValue(page);

    const result = await getScheduleMessages('s1');

    expect(getMock).toHaveBeenCalledWith('/schedules/s1/messages');
    expect(result).toEqual(page);
  });

  it('cursor만 있으면 쿼리에 cursor만 포함해서 호출한다', async () => {
    const page = buildPage({ nextCursor: 'c2', hasMore: true });
    getMock.mockResolvedValue(page);

    const result = await getScheduleMessages('s1', { cursor: 'c1' });

    expect(getMock).toHaveBeenCalledWith('/schedules/s1/messages?cursor=c1');
    expect(result).toEqual(page);
  });

  it('cursor와 limit이 모두 있으면 쿼리에 둘 다 포함해서 호출한다', async () => {
    const page = buildPage({ nextCursor: 'c2', hasMore: true });
    getMock.mockResolvedValue(page);

    const result = await getScheduleMessages('s1', { cursor: 'c1', limit: 20 });

    expect(getMock).toHaveBeenCalledWith('/schedules/s1/messages?cursor=c1&limit=20');
    expect(result).toEqual(page);
  });

  it('hasMore가 true인 응답을 그대로 반환한다', async () => {
    const page = buildPage({ nextCursor: 'c2', hasMore: true });
    getMock.mockResolvedValue(page);

    const result = await getScheduleMessages('s1');

    expect(result).toEqual(page);
  });

  it('hasMore가 false인 응답을 그대로 반환한다', async () => {
    const page = buildPage({ nextCursor: null, hasMore: false });
    getMock.mockResolvedValue(page);

    const result = await getScheduleMessages('s1');

    expect(result).toEqual(page);
  });

  it('get이 ApiError(403)로 실패하면 그대로 전파한다', async () => {
    const error = new ApiError(403, 'NOT_MEMBER', '이 팀의 채팅에 접근할 권한이 없습니다');
    getMock.mockRejectedValue(error);

    await expect(getScheduleMessages('s1')).rejects.toBe(error);
  });

  it('get이 ApiError(404)로 실패하면 그대로 전파한다', async () => {
    const error = new ApiError(404, 'NOT_FOUND', '채팅 이력을 찾을 수 없습니다');
    getMock.mockRejectedValue(error);

    await expect(getScheduleMessages('s1')).rejects.toBe(error);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ChatMessage, PaginatedChatMessages } from '../../../shared/types/chat.types';
import { ApiError } from '../../../shared/api/api-error';
import { useChatPolling } from './use-chat-polling';
import { pollScheduleMessages, sendScheduleMessage } from '../api/chat.api';

vi.mock('../api/chat.api', () => ({
  pollScheduleMessages: vi.fn(),
  sendScheduleMessage: vi.fn(),
}));

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    chatId: 'c1',
    senderUserId: 'u1',
    content: '안녕하세요',
    createdAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

function emptyPage(): PaginatedChatMessages {
  return { data: [], nextCursor: null, hasMore: false };
}

function pending(): {
  promise: Promise<PaginatedChatMessages>;
  resolve: (v: PaginatedChatMessages) => void;
} {
  let resolve!: (v: PaginatedChatMessages) => void;
  const promise = new Promise<PaginatedChatMessages>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// 실제 서버는 새 메시지가 없으면 timeout(최대 25초)만큼 응답을 들고 있다가
// 돌려주므로 클라이언트 쪽 루프가 자연히 그 시간만큼 쉬게 된다. 테스트 목은
// 그 지연이 없어 즉시 resolve되므로, 마지막 호출 이후를 무한정 이어가지
// 않도록 "더 이상 관심 없는 호출"은 절대 resolve하지 않는 pending 프라미스로
// 막아 재귀 폴링 루프가 매 테스트마다 자연스럽게 멈추게 한다(안 그러면 루프가
// 실제 지연 없이 무한 재귀해 테스트 워커가 메모리 부족으로 죽는다).
const NEVER = () => pending().promise;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useChatPolling', () => {
  it('마운트 시 pollScheduleMessages를 initialCursor로 호출한다', async () => {
    vi.mocked(pollScheduleMessages).mockResolvedValueOnce(emptyPage()).mockImplementation(NEVER);

    const { unmount } = renderHook(() =>
      useChatPolling({ scheduleId: 's1', token: 'tok', enabled: true, initialCursor: 'c0', onMessage: vi.fn() }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(pollScheduleMessages).toHaveBeenCalledWith('s1', expect.objectContaining({ cursor: 'c0' }));
    unmount();
  });

  it('enabled가 false이면 폴링을 시작하지 않는다', async () => {
    vi.mocked(pollScheduleMessages).mockImplementation(NEVER);

    const { unmount } = renderHook(() =>
      useChatPolling({ scheduleId: 's1', token: 'tok', enabled: false, initialCursor: null, onMessage: vi.fn() }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(pollScheduleMessages).not.toHaveBeenCalled();
    unmount();
  });

  it('응답에 새 메시지가 있으면 onMessage를 호출하고 status가 open이 된다', async () => {
    const message = buildMessage();
    const first = pending();
    vi.mocked(pollScheduleMessages).mockReturnValueOnce(first.promise).mockImplementation(NEVER);
    const onMessage = vi.fn();

    const { result, unmount } = renderHook(() =>
      useChatPolling({ scheduleId: 's1', token: 'tok', enabled: true, initialCursor: null, onMessage }),
    );

    await act(async () => {
      first.resolve({ data: [message], nextCursor: null, hasMore: false });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onMessage).toHaveBeenCalledWith(message);
    expect(result.current.status).toBe('open');
    unmount();
  });

  it('다음 호출은 마지막으로 받은 메시지의 createdAt을 cursor로 사용한다', async () => {
    const message = buildMessage({ createdAt: '2026-04-01T00:00:05.000Z' });
    const first = pending();
    const second = pending(); // 의도적으로 resolve하지 않아 루프가 여기서 멈춘다.
    vi.mocked(pollScheduleMessages)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockImplementation(NEVER);

    const { unmount } = renderHook(() =>
      useChatPolling({ scheduleId: 's1', token: 'tok', enabled: true, initialCursor: null, onMessage: vi.fn() }),
    );

    await act(async () => {
      first.resolve({ data: [message], nextCursor: null, hasMore: false });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(pollScheduleMessages).toHaveBeenNthCalledWith(
      2,
      's1',
      expect.objectContaining({ cursor: '2026-04-01T00:00:05.000Z' }),
    );
    unmount();
  });

  it('폴링이 401로 실패하면 auth-expired가 되고 재시도하지 않는다', async () => {
    vi.mocked(pollScheduleMessages).mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', '만료'));

    const { result, unmount } = renderHook(() =>
      useChatPolling({ scheduleId: 's1', token: 'tok', enabled: true, initialCursor: null, onMessage: vi.fn() }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.status).toBe('auth-expired');

    vi.mocked(pollScheduleMessages).mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(pollScheduleMessages).not.toHaveBeenCalled();
    unmount();
  });

  it('폴링이 네트워크 오류로 실패하면 reconnecting이 되고 백오프 후 재시도한다', async () => {
    vi.mocked(pollScheduleMessages)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(emptyPage())
      .mockImplementation(NEVER);

    const { result, unmount } = renderHook(() =>
      useChatPolling({ scheduleId: 's1', token: 'tok', enabled: true, initialCursor: null, onMessage: vi.fn() }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.status).toBe('reconnecting');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(pollScheduleMessages).toHaveBeenCalledTimes(3);
    expect(result.current.status).toBe('open');
    unmount();
  });

  it('sendMessage 성공 시 onMessage를 호출하고 true를 반환한다', async () => {
    vi.mocked(pollScheduleMessages).mockImplementation(NEVER);
    const sent = buildMessage({ id: 'sent-1', content: '전송됨' });
    vi.mocked(sendScheduleMessage).mockResolvedValue(sent);
    const onMessage = vi.fn();

    const { result, unmount } = renderHook(() =>
      useChatPolling({ scheduleId: 's1', token: 'tok', enabled: true, initialCursor: null, onMessage }),
    );

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.sendMessage('전송됨');
    });

    expect(ok).toBe(true);
    expect(sendScheduleMessage).toHaveBeenCalledWith('s1', '전송됨');
    expect(onMessage).toHaveBeenCalledWith(sent);
    unmount();
  });

  it('sendMessage 실패 시 false를 반환한다', async () => {
    vi.mocked(pollScheduleMessages).mockImplementation(NEVER);
    vi.mocked(sendScheduleMessage).mockRejectedValue(new ApiError(403, 'FORBIDDEN', '권한 없음'));

    const { result, unmount } = renderHook(() =>
      useChatPolling({ scheduleId: 's1', token: 'tok', enabled: true, initialCursor: null, onMessage: vi.fn() }),
    );

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.sendMessage('실패');
    });

    expect(ok).toBe(false);
    unmount();
  });

  it('언마운트 시 예약된 재시도 타이머를 정리하고 더 이상 폴링하지 않는다', async () => {
    vi.mocked(pollScheduleMessages).mockRejectedValue(new Error('network'));

    const { unmount } = renderHook(() =>
      useChatPolling({ scheduleId: 's1', token: 'tok', enabled: true, initialCursor: null, onMessage: vi.fn() }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    unmount();
    vi.mocked(pollScheduleMessages).mockClear();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });

    expect(pollScheduleMessages).not.toHaveBeenCalled();
  });
});

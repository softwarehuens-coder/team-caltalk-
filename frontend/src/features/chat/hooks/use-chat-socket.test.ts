import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ChatMessage } from '../../../shared/types/chat.types';
import { useChatSocket } from './use-chat-socket';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  triggerOpen(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  triggerMessage(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  triggerClose(code: number): void {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

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

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('useChatSocket', () => {
  it('마운트 시 WebSocket을 생성하고 URL에 token 쿼리를 포함한다', () => {
    renderHook(() => useChatSocket({ scheduleId: 's1', token: 'tok123', onMessage: vi.fn() }));

    expect(FakeWebSocket.instances).toHaveLength(1);
    const expectedUrl = `ws://${window.location.host}/ws/chat?token=${encodeURIComponent('tok123')}`;
    expect(FakeWebSocket.instances[0].url).toBe(expectedUrl);
  });

  it('onopen 이후 join 프레임을 전송하고 status가 open이 된다', () => {
    const { result } = renderHook(() => useChatSocket({ scheduleId: 's1', token: 'tok', onMessage: vi.fn() }));
    const socket = FakeWebSocket.instances[0];

    act(() => {
      socket.triggerOpen();
    });

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'join', scheduleId: 's1' }));
    expect(result.current.status).toBe('open');
  });

  it('scheduleId가 변경되면 소켓을 재생성하지 않고 재join 프레임만 전송한다', () => {
    const { rerender } = renderHook(
      ({ scheduleId }: { scheduleId: string }) => useChatSocket({ scheduleId, token: 'tok', onMessage: vi.fn() }),
      { initialProps: { scheduleId: 's1' } },
    );
    const socket = FakeWebSocket.instances[0];
    act(() => {
      socket.triggerOpen();
    });
    socket.send.mockClear();

    rerender({ scheduleId: 's2' });

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'join', scheduleId: 's2' }));
  });

  it('메시지를 수신하면 onMessage 콜백을 호출한다', () => {
    const onMessage = vi.fn();
    renderHook(() => useChatSocket({ scheduleId: 's1', token: 'tok', onMessage }));
    const socket = FakeWebSocket.instances[0];
    act(() => {
      socket.triggerOpen();
    });
    const message = buildMessage();

    act(() => {
      socket.triggerMessage({ type: 'message', message });
    });

    expect(onMessage).toHaveBeenCalledWith(message);
  });

  it('예기치 않은 종료 후 지수 백오프로 재연결하고, 재연결 성공 시 재join한다', () => {
    // 백오프 간격에는 ±20% 지터가 포함되므로(1차 800~1200ms, 2차 1600~2400ms),
    // 재연결이 아직 일어나지 않았음을 확인할 때는 지터 하한보다 짧게, 재연결이
    // 일어났음을 확인할 때는 지터 상한보다 길게 시간을 진행시킨다.
    const { result } = renderHook(() => useChatSocket({ scheduleId: 's1', token: 'tok', onMessage: vi.fn() }));
    const first = FakeWebSocket.instances[0];
    act(() => {
      first.triggerOpen();
    });

    act(() => {
      first.triggerClose(1006);
    });
    expect(result.current.status).toBe('reconnecting');
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(FakeWebSocket.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(FakeWebSocket.instances).toHaveLength(2);

    const second = FakeWebSocket.instances[1];
    act(() => {
      second.triggerClose(1006);
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(FakeWebSocket.instances).toHaveLength(2);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(FakeWebSocket.instances).toHaveLength(3);

    const third = FakeWebSocket.instances[2];
    third.send.mockClear();
    act(() => {
      third.triggerOpen();
    });
    expect(result.current.status).toBe('open');
    expect(third.send).toHaveBeenCalledWith(JSON.stringify({ type: 'join', scheduleId: 's1' }));
  });

  it('close code가 4401이면 auth-expired 상태가 되고 재연결하지 않는다', () => {
    const { result } = renderHook(() => useChatSocket({ scheduleId: 's1', token: 'tok', onMessage: vi.fn() }));
    const first = FakeWebSocket.instances[0];
    act(() => {
      first.triggerOpen();
    });

    act(() => {
      first.triggerClose(4401);
    });
    expect(result.current.status).toBe('auth-expired');

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('연결 상태가 open이 아니면 sendMessage는 false를 반환하고 send를 호출하지 않는다', () => {
    const { result } = renderHook(() => useChatSocket({ scheduleId: 's1', token: 'tok', onMessage: vi.fn() }));
    const socket = FakeWebSocket.instances[0];

    let sent: boolean | undefined;
    act(() => {
      sent = result.current.sendMessage('안녕');
    });

    expect(sent).toBe(false);
    expect(socket.send).not.toHaveBeenCalled();
  });

  it('언마운트 시 연결된 소켓을 close(1000)로 종료하고 예약된 재연결 타이머를 정리한다', () => {
    const { unmount: unmountOpen } = renderHook(() =>
      useChatSocket({ scheduleId: 's1', token: 'tok', onMessage: vi.fn() }),
    );
    const openSocket = FakeWebSocket.instances[0];
    act(() => {
      openSocket.triggerOpen();
    });

    unmountOpen();

    expect(openSocket.close).toHaveBeenCalledWith(1000);

    FakeWebSocket.instances = [];
    const { unmount: unmountReconnecting } = renderHook(() =>
      useChatSocket({ scheduleId: 's1', token: 'tok', onMessage: vi.fn() }),
    );
    const reconnectingSocket = FakeWebSocket.instances[0];
    act(() => {
      reconnectingSocket.triggerOpen();
    });
    act(() => {
      reconnectingSocket.triggerClose(1006);
    });

    unmountReconnecting();

    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});

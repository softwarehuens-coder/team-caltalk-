import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../../shared/types/chat.types';
import { pollScheduleMessages, sendScheduleMessage } from '../api/chat.api';
import { ApiError } from '../../../shared/api/api-error';

export type ChatConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'auth-expired' | 'closed';

interface UseChatPollingOptions {
  scheduleId: string;
  token: string | null;
  // 채팅 이력이 아직 로딩 중이면 폴링을 시작하지 않는다(같은 스케줄에 대해
  // 이력 조회와 폴링이 각자 별도로 권한 검사를 하는 중복 요청을 피한다).
  enabled: boolean;
  // 폴링을 시작할 때 딱 한 번만 읽는 시드 값이다(이미 로드된 이력의 마지막
  // 메시지 createdAt). 이후 값이 바뀌어도 이미 시작된 폴링 루프에는 영향을
  // 주지 않는다 — 매 메시지 도착마다 폴링을 재시작할 필요가 없기 때문이다.
  initialCursor: string | null;
  onMessage(message: ChatMessage): void;
}

interface UseChatPollingResult {
  status: ChatConnectionStatus;
  sendMessage(content: string): Promise<boolean>;
}

const POLL_TIMEOUT_MS = 25000;
const RETRY_INITIAL_BACKOFF_MS = 1000;
const RETRY_MAX_BACKOFF_MS = 30000;

function isAuthExpired(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function useChatPolling(options: UseChatPollingOptions): UseChatPollingResult {
  const [status, setStatus] = useState<ChatConnectionStatus>('connecting');

  const scheduleIdRef = useRef(options.scheduleId);
  scheduleIdRef.current = options.scheduleId;

  const onMessageRef = useRef(options.onMessage);
  onMessageRef.current = options.onMessage;

  const initialCursorRef = useRef(options.initialCursor);
  initialCursorRef.current = options.initialCursor;

  useEffect(() => {
    if (!options.enabled || !options.token) {
      return;
    }

    let isActive = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let cursor = initialCursorRef.current;

    const scheduleRetry = (): void => {
      if (!isActive) return;
      setStatus('reconnecting');
      const backoff = Math.min(RETRY_INITIAL_BACKOFF_MS * 2 ** attempt, RETRY_MAX_BACKOFF_MS);
      const jitter = backoff * 0.2 * (Math.random() * 2 - 1);
      attempt += 1;
      retryTimer = setTimeout(() => {
        void loop();
      }, Math.max(0, backoff + jitter));
    };

    const loop = async (): Promise<void> => {
      if (!isActive) return;
      try {
        const result = await pollScheduleMessages(scheduleIdRef.current, {
          cursor,
          timeoutMs: POLL_TIMEOUT_MS,
        });
        if (!isActive) return;
        attempt = 0;
        setStatus('open');
        if (result.data.length > 0) {
          cursor = result.data[result.data.length - 1].createdAt;
          for (const message of result.data) {
            onMessageRef.current(message);
          }
        }
        void loop();
      } catch (error) {
        if (!isActive) return;
        if (isAuthExpired(error)) {
          setStatus('auth-expired');
          return;
        }
        scheduleRetry();
      }
    };

    setStatus('connecting');
    void loop();

    return () => {
      isActive = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [options.scheduleId, options.token, options.enabled]);

  const sendMessage = async (content: string): Promise<boolean> => {
    try {
      const message = await sendScheduleMessage(scheduleIdRef.current, content);
      onMessageRef.current(message);
      return true;
    } catch (error) {
      if (isAuthExpired(error)) {
        setStatus('auth-expired');
      }
      return false;
    }
  };

  return { status, sendMessage };
}

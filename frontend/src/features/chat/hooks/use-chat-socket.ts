import { useEffect, useRef, useState } from 'react';
import type {
  ChatMessage,
  ChatSocketClientFrame,
  ChatSocketServerFrame,
} from '../../../shared/types/chat.types';

export type ChatConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'auth-expired' | 'closed';

interface UseChatSocketOptions {
  scheduleId: string;
  token: string | null;
  onMessage(message: ChatMessage): void;
}

interface UseChatSocketResult {
  status: ChatConnectionStatus;
  sendMessage(content: string): boolean;
}

const AUTH_EXPIRED_CLOSE_CODE = 4401;
const INTENTIONAL_CLOSE_CODE = 1000;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
const WS_BASE_PATH = import.meta.env.VITE_WS_BASE_URL ?? '/ws';

function buildSocketUrl(token: string | null): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}${WS_BASE_PATH}/chat?token=${encodeURIComponent(token ?? '')}`;
}

function sendFrame(socket: WebSocket, frame: ChatSocketClientFrame): void {
  socket.send(JSON.stringify(frame));
}

export function useChatSocket(options: UseChatSocketOptions): UseChatSocketResult {
  const [status, setStatus] = useState<ChatConnectionStatus>('connecting');

  const scheduleIdRef = useRef(options.scheduleId);
  scheduleIdRef.current = options.scheduleId;

  const onMessageRef = useRef(options.onMessage);
  onMessageRef.current = options.onMessage;

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let isActive = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const connect = (): void => {
      if (!isActive) {
        return;
      }

      setStatus((current) => (current === 'reconnecting' ? current : 'connecting'));

      const socket = new WebSocket(buildSocketUrl(options.token));
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isActive) {
          return;
        }
        attempt = 0;
        setStatus('open');
        sendFrame(socket, { type: 'join', scheduleId: scheduleIdRef.current });
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        if (!isActive) {
          return;
        }
        let frame: ChatSocketServerFrame;
        try {
          frame = JSON.parse(event.data) as ChatSocketServerFrame;
        } catch {
          return;
        }

        if (frame.type === 'message') {
          onMessageRef.current(frame.message);
        } else if (frame.type === 'error') {
          console.warn('채팅 소켓 에러:', frame.code, frame.message);
        }
      };

      socket.onclose = (event: CloseEvent) => {
        if (!isActive) {
          return;
        }
        socketRef.current = null;

        if (event.code === AUTH_EXPIRED_CLOSE_CODE) {
          setStatus('auth-expired');
          return;
        }

        if (event.code === INTENTIONAL_CLOSE_CODE) {
          setStatus('closed');
          return;
        }

        setStatus('reconnecting');
        const backoff = Math.min(INITIAL_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
        const jitter = backoff * 0.2 * (Math.random() * 2 - 1);
        attempt += 1;
        reconnectTimer = setTimeout(() => {
          connect();
        }, Math.max(0, backoff + jitter));
      };
    };

    connect();

    return () => {
      isActive = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.close(INTENTIONAL_CLOSE_CODE);
      }
    };
  }, [options.token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendFrame(socket, { type: 'join', scheduleId: options.scheduleId });
    }
  }, [options.scheduleId]);

  const sendMessage = (content: string): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    sendFrame(socket, { type: 'message', scheduleId: scheduleIdRef.current, content });
    return true;
  };

  return { status, sendMessage };
}

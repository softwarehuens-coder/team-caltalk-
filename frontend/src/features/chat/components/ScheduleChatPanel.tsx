import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useAuth } from '../../auth/hooks/use-auth';
import type { ChatMessage } from '../../../shared/types/chat.types';
import type { Schedule } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';
import { useChatSocket, type ChatConnectionStatus } from '../hooks/use-chat-socket';

export interface ScheduleChatPanelProps {
  schedule: Schedule;
  members: TeamMember[];
  isLeader: boolean;
  onClose(): void;
  onEditClick(schedule: Schedule): void;
}

const MAX_MESSAGE_LENGTH = 500;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ko-KR');
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status, onReLogin }: { status: ChatConnectionStatus; onReLogin(): void }) {
  if (status === 'open') {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">온라인</span>
    );
  }
  if (status === 'reconnecting') {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        재연결 중..
      </span>
    );
  }
  if (status === 'auth-expired') {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">인증 만료</span>
        <button
          type="button"
          onClick={onReLogin}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          다시 로그인
        </button>
      </div>
    );
  }
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">연결 중..</span>;
}

export function ScheduleChatPanel({ schedule, members, isLeader, onClose, onEditClick }: ScheduleChatPanelProps) {
  const { token, logout } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([]);
  }, [schedule.id]);

  const { status, sendMessage } = useChatSocket({
    scheduleId: schedule.id,
    token,
    onMessage: (message) => setMessages((prev) => [...prev, message]),
  });

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const participantNames = schedule.participants
    .map((participant) => members.find((member) => member.userId === participant.userId)?.name ?? participant.userId)
    .join(', ');

  const handleSend = (): void => {
    const trimmed = content.trim();
    if (!trimmed || status !== 'open') {
      return;
    }
    if (sendMessage(trimmed)) {
      setContent('');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="flex w-full max-w-3xl bg-white shadow-lg">
        <div className="flex flex-1 flex-col gap-4 p-6">
          <button type="button" onClick={onClose} className="self-start text-sm text-primary-600 hover:text-primary-700">
            ← 캘린더로 돌아가기
          </button>
          <h2 className="text-lg font-bold text-gray-900">{schedule.title}</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <dl className="flex flex-col gap-2 text-sm text-gray-700">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-gray-500">시작</dt>
                <dd>{formatDateTime(schedule.startAt)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-gray-500">종료</dt>
                <dd>{formatDateTime(schedule.endAt)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-gray-500">참여자</dt>
                <dd>{participantNames || '없음'}</dd>
              </div>
            </dl>
          </div>
          {isLeader && (
            <button
              type="button"
              onClick={() => onEditClick(schedule)}
              className="self-start rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              수정
            </button>
          )}
        </div>
        <aside className="w-80 border-l border-gray-200 flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="truncate text-sm font-bold text-gray-900">{schedule.title}</h3>
            <StatusBadge status={status} onReLogin={logout} />
          </div>
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-400">아직 메시지가 없습니다</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {messages.map((message) => {
                  const senderName = members.find((member) => member.userId === message.senderUserId)?.name ?? '알 수 없음';
                  return (
                    <li key={message.id} className="text-sm text-gray-700">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-gray-900">{senderName}</span>
                        <span className="text-xs text-gray-400">{formatTime(message.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-2 border-t border-gray-200 p-3">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={handleKeyDown}
              disabled={status !== 'open'}
              rows={3}
              className="resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none disabled:bg-gray-100"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {content.length}/{MAX_MESSAGE_LENGTH}
              </span>
              <button
                type="button"
                onClick={handleSend}
                disabled={status !== 'open'}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                전송
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

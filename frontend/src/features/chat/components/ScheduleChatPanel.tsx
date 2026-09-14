import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useAuth } from '../../auth/hooks/use-auth';
import type { ChatMessage } from '../../../shared/types/chat.types';
import type { Schedule } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';
import type { ChangeRequest } from '../../../shared/types/change-request.types';
import { useChatSocket, type ChatConnectionStatus } from '../hooks/use-chat-socket';
import { getScheduleMessages } from '../api/chat.api';
import { listChangeRequests } from '../api/change-request.api';
import { ApiError } from '../../../shared/api/api-error';
import { ChangeRequestForm } from './ChangeRequestForm';
import { ChangeRequestApproval } from './ChangeRequestApproval';

export interface ScheduleChatPanelProps {
  schedule: Schedule;
  members: TeamMember[];
  isLeader: boolean;
  onClose(): void;
  onEditClick(schedule: Schedule): void;
  onScheduleApproved?: () => void;
}

const MAX_MESSAGE_LENGTH = 500;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ko-KR');
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function mergeById(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  [...a, ...b].forEach((m) => map.set(m.id, m));
  return Array.from(map.values()).sort(
    (x, y) => new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime(),
  );
}

type TimelineItem =
  | { kind: 'message'; key: string; createdAt: string; message: ChatMessage }
  | { kind: 'changeRequest'; key: string; createdAt: string; changeRequest: ChangeRequest };

function buildTimeline(messages: ChatMessage[], changeRequests: ChangeRequest[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...messages.map((m) => ({ kind: 'message' as const, key: `m-${m.id}`, createdAt: m.createdAt, message: m })),
    ...changeRequests.map((c) => ({
      kind: 'changeRequest' as const,
      key: `c-${c.id}`,
      createdAt: c.createdAt,
      changeRequest: c,
    })),
  ];
  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}



function getHistoryErrorMessage(error: ApiError): string {
  if (error.status === 403) {
    return '이 팀의 채팅에 접근할 권한이 없습니다';
  }
  if (error.status === 404) {
    return '채팅 이력을 찾을 수 없습니다(팀이 삭제되었을 수 있습니다)';
  }
  return '채팅 이력을 불러오지 못했습니다';
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

export function ScheduleChatPanel({ schedule, members, isLeader, onClose, onEditClick, onScheduleApproved }: ScheduleChatPanelProps) {
  const { token, logout, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingChangeRequests, setPendingChangeRequests] = useState<ChangeRequest[]>([]);
  const [isChangeRequestFormOpen, setIsChangeRequestFormOpen] = useState(false);
  const [content, setContent] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<ApiError | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isPrependingRef = useRef(false);
  const prevScrollHeightRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setPendingChangeRequests([]);
    setIsChangeRequestFormOpen(false);
    setNextCursor(null);
    setHasMore(false);
    setIsLoadingHistory(true);
    setHistoryError(null);
    getScheduleMessages(schedule.id)
      .then((result) => {
        if (cancelled) return;
        setMessages((prev) => mergeById(result.data, prev));
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
        setIsLoadingHistory(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setHistoryError(error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', '채팅 이력을 불러오지 못했습니다.'));
        setIsLoadingHistory(false);
      });
    // 변경 요청은 제출자 탭의 로컬 state에만 남으면 팀장이 새로고침/재접속 시 대기중
    // 요청을 영원히 볼 수 없다 — 서버를 SSOT로 삼아 매번 다시 조회한다.
    listChangeRequests(schedule.id)
      .then((result) => {
        if (cancelled) return;
        setPendingChangeRequests(result);
      })
      .catch((error) => {
        console.error('Failed to load change requests:', error);
      });
    return () => {
      cancelled = true;
    };
  }, [schedule.id]);

  const refreshHistory = () => {
    getScheduleMessages(schedule.id)
      .then((result) => {
        setMessages((prev) => mergeById(result.data, prev));
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      })
      .catch((error) => {
        console.error('Failed to refresh history:', error);
      });
  };

  const { status, sendMessage } = useChatSocket({
    scheduleId: schedule.id,
    token,
    onMessage: (message) =>
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message])),
  });

  const timeline = useMemo(
    () => buildTimeline(messages, pendingChangeRequests),
    [messages, pendingChangeRequests],
  );

  useEffect(() => {
    if (isPrependingRef.current) return;
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, pendingChangeRequests]);

  useLayoutEffect(() => {
    if (!isPrependingRef.current) return;
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight - prevScrollHeightRef.current;
    }
    isPrependingRef.current = false;
  }, [messages]);

  const handleLoadMore = (): void => {
    if (isLoadingMore || !nextCursor) return;
    isPrependingRef.current = true;
    prevScrollHeightRef.current = scrollContainerRef.current?.scrollHeight ?? 0;
    setIsLoadingMore(true);
    getScheduleMessages(schedule.id, { cursor: nextCursor })
      .then((result) => {
        setMessages((prev) => mergeById(result.data, prev));
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
        setIsLoadingMore(false);
      })
      .catch(() => {
        isPrependingRef.current = false;
        setIsLoadingMore(false);
      });
  };

  const participantNames = schedule.participants
    .map((participant) => members.find((member) => member.userId === participant.userId)?.name ?? participant.userId)
    .join(', ');

  const isParticipant = schedule.participants.some((p) => p.userId === user?.id);
  const canSubmitChangeRequest = !isLeader && isParticipant;

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
            {isLoadingHistory ? (
              <p className="text-sm text-gray-400">채팅 이력을 불러오는 중입니다..</p>
            ) : historyError ? (
              <p className="text-sm text-red-500">{getHistoryErrorMessage(historyError)}</p>
            ) : timeline.length === 0 ? (
              <p className="text-sm text-gray-400">아직 메시지가 없습니다</p>
            ) : (
              <>
                {hasMore && (
                  <div className="mb-3 flex justify-center">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLoadingMore ? '불러오는 중...' : '이전 메시지 더 보기'}
                    </button>
                  </div>
                )}
                <ul className="flex flex-col gap-3">
                  {timeline.map((item) => {
                    if (item.kind === 'changeRequest') {
                      return (
                        <li key={item.key}>
                          <ChangeRequestApproval
                            changeRequest={item.changeRequest}
                            members={members}
                            isLeader={isLeader}
                            onStatusUpdated={(updatedCr) => {
                              setPendingChangeRequests((prev) =>
                                prev.map((cr) => (cr.id === updatedCr.id ? updatedCr : cr))
                              );
                            }}
                            onScheduleApproved={onScheduleApproved}
                            onRefreshHistory={refreshHistory}
                          />
                        </li>
                      );
                    }
                    const message = item.message;
                    const senderName = members.find((member) => member.userId === message.senderUserId)?.name ?? '알 수 없음';
                    return (
                      <li key={item.key} className="text-sm text-gray-700">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-gray-900">{senderName}</span>
                          <span className="text-xs text-gray-400">{formatTime(message.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
          {canSubmitChangeRequest && (
            <div className="border-t border-gray-200 px-3 py-2">
              <button
                type="button"
                onClick={() => setIsChangeRequestFormOpen(true)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                변경 요청 작성
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-gray-200 p-3">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={handleKeyDown}
              disabled={status !== 'open' || Boolean(historyError)}
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
                disabled={status !== 'open' || Boolean(historyError)}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                전송
              </button>
            </div>
          </div>
        </aside>
      </div>
      {isChangeRequestFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <ChangeRequestForm
              scheduleId={schedule.id}
              scheduleTitle={schedule.title}
              onSubmitted={(cr) => {
                setPendingChangeRequests((prev) => [...prev, cr]);
                setIsChangeRequestFormOpen(false);
              }}
              onCancel={() => setIsChangeRequestFormOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

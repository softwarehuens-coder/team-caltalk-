import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Schedule } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';
import type { ChatMessage, PaginatedChatMessages } from '../../../shared/types/chat.types';
import { ApiError } from '../../../shared/api/api-error';

type UseChatSocketOptions = {
  scheduleId: string;
  token: string | null;
  onMessage(message: ChatMessage): void;
};

const useChatSocketMock = vi.fn();
const useAuthMock = vi.fn();
const logoutMock = vi.fn();
const sendMessageMock = vi.fn().mockReturnValue(true);

vi.mock('../hooks/use-chat-socket', () => ({
  useChatSocket: (options: UseChatSocketOptions) => useChatSocketMock(options),
}));

vi.mock('../../auth/hooks/use-auth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../api/chat.api', () => ({
  getScheduleMessages: vi.fn(),
}));

import { ScheduleChatPanel } from './ScheduleChatPanel';
import { getScheduleMessages } from '../api/chat.api';

const members: TeamMember[] = [
  { userId: 'u1', email: 'leader@test.com', name: '홍길동', role: 'LEADER', joinedAt: '2026-01-01T00:00:00.000Z' },
  { userId: 'u2', email: 'member@test.com', name: '김철수', role: 'MEMBER', joinedAt: '2026-01-02T00:00:00.000Z' },
];

function buildSchedule(id: string, title: string, overrides: Partial<Schedule> = {}): Schedule {
  return {
    id,
    teamId: 't1',
    title,
    startAt: new Date(2026, 3, 15, 9).toISOString(),
    endAt: new Date(2026, 3, 15, 10).toISOString(),
    createdAt: '2026-04-01T00:00:00.000Z',
    deletedAt: null,
    participants: [],
    ...overrides,
  };
}

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    chatId: 'c1',
    senderUserId: 'u2',
    content: '안녕하세요',
    createdAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

function setupChatSocket(status: 'connecting' | 'open' | 'reconnecting' | 'auth-expired' | 'closed' = 'open') {
  useChatSocketMock.mockImplementation((options: UseChatSocketOptions) => ({
    status,
    sendMessage: sendMessageMock,
    __options: options,
  }));
}

function lastOnMessage(): (message: ChatMessage) => void {
  const lastCall = useChatSocketMock.mock.calls.at(-1);
  if (!lastCall) {
    throw new Error('useChatSocket이 호출되지 않았습니다');
  }
  return (lastCall[0] as UseChatSocketOptions).onMessage;
}

function renderPanel(props: Partial<Parameters<typeof ScheduleChatPanel>[0]> = {}) {
  const schedule = props.schedule ?? buildSchedule('s1', '주간 회의');
  const onClose = props.onClose ?? vi.fn();
  const onEditClick = props.onEditClick ?? vi.fn();
  const utils = render(
    <ScheduleChatPanel
      schedule={schedule}
      members={props.members ?? members}
      isLeader={props.isLeader ?? false}
      onClose={onClose}
      onEditClick={onEditClick}
    />,
  );
  return { ...utils, schedule, onClose, onEditClick };
}

function emptyHistoryPage(): PaginatedChatMessages {
  return { data: [], nextCursor: null, hasMore: false };
}

beforeEach(() => {
  vi.mocked(getScheduleMessages).mockResolvedValue(emptyHistoryPage());
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ScheduleChatPanel', () => {
  it('일정 상세 필드를 렌더링한다', () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    const schedule = buildSchedule('s1', '주간 회의');

    renderPanel({ schedule });

    expect(screen.getAllByText('주간 회의').length).toBeGreaterThan(0);
    expect(screen.getByText('시작')).toBeInTheDocument();
    expect(screen.getByText('종료')).toBeInTheDocument();
  });

  it('isLeader=false이면 수정 버튼이 노출되지 않는다', () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });

    renderPanel({ isLeader: false });

    expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
  });

  it('isLeader=true이면 수정 버튼이 노출되고 클릭 시 onEditClick을 호출한다', async () => {
    const user = userEvent.setup();
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    const schedule = buildSchedule('s1', '주간 회의');
    const { onEditClick } = renderPanel({ isLeader: true, schedule });

    await user.click(screen.getByRole('button', { name: '수정' }));

    expect(onEditClick).toHaveBeenCalledWith(schedule);
  });

  it('메시지가 없으면 안내 문구를 표시한다', async () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });

    renderPanel();

    expect(await screen.findByText('아직 메시지가 없습니다')).toBeInTheDocument();
  });

  it('onMessage 콜백이 호출되면 메시지 목록에 발신자 이름과 함께 추가된다', async () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    renderPanel();
    await screen.findByText('아직 메시지가 없습니다');
    const message = buildMessage({ senderUserId: 'u2', content: '안녕하세요' });

    act(() => {
      lastOnMessage()(message);
    });

    expect(screen.getByText('안녕하세요')).toBeInTheDocument();
    expect(screen.getByText('김철수')).toBeInTheDocument();
  });

  it('status가 reconnecting이면 입력창/전송버튼이 disabled이고 배지 문구를 표시한다', () => {
    setupChatSocket('reconnecting');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });

    renderPanel();

    expect(screen.getByText('재연결 중..')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: '전송' })).toBeDisabled();
  });

  it('status가 auth-expired이면 다시 로그인 버튼이 노출되고 클릭 시 logout을 호출한다', async () => {
    const user = userEvent.setup();
    setupChatSocket('auth-expired');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });

    renderPanel();

    expect(screen.getByText('인증 만료')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다시 로그인' }));

    expect(logoutMock).toHaveBeenCalled();
  });

  it('Enter를 누르면 메시지를 전송하고 입력창을 비운다', async () => {
    const user = userEvent.setup();
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });

    renderPanel();
    const textarea = screen.getByRole('textbox');

    await user.type(textarea, '안녕하세요{Enter}');

    expect(sendMessageMock).toHaveBeenCalledWith('안녕하세요');
    expect(textarea).toHaveValue('');
  });

  it('Shift+Enter를 누르면 전송하지 않고 줄바꿈만 삽입한다', async () => {
    const user = userEvent.setup();
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });

    renderPanel();
    const textarea = screen.getByRole('textbox');

    await user.type(textarea, '첫줄{Shift>}{Enter}{/Shift}둘째줄');

    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('첫줄\n둘째줄');
  });

  it('schedule.id가 변경되면 메시지 목록이 초기화되어 이전 일정의 메시지와 섞이지 않는다', async () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    const scheduleA = buildSchedule('s1', '주간 회의');
    const { rerender } = render(
      <ScheduleChatPanel schedule={scheduleA} members={members} isLeader={false} onClose={vi.fn()} onEditClick={vi.fn()} />,
    );
    await screen.findByText('아직 메시지가 없습니다');

    act(() => {
      lastOnMessage()(buildMessage({ id: 'm1', content: 'A 일정 메시지' }));
    });
    expect(screen.getByText('A 일정 메시지')).toBeInTheDocument();

    const scheduleB = buildSchedule('s2', '월간 회의');
    rerender(
      <ScheduleChatPanel schedule={scheduleB} members={members} isLeader={false} onClose={vi.fn()} onEditClick={vi.fn()} />,
    );

    expect(screen.queryByText('A 일정 메시지')).not.toBeInTheDocument();
    await screen.findByText('아직 메시지가 없습니다');

    act(() => {
      lastOnMessage()(buildMessage({ id: 'm2', content: 'B 일정 메시지' }));
    });
    expect(screen.getByText('B 일정 메시지')).toBeInTheDocument();
    expect(screen.queryByText('A 일정 메시지')).not.toBeInTheDocument();
  });

  it('닫기(캘린더로 돌아가기) 버튼을 클릭하면 onClose를 호출한다', async () => {
    const user = userEvent.setup();
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    const { onClose } = renderPanel();

    await user.click(screen.getByRole('button', { name: /캘린더로 돌아가기/ }));

    expect(onClose).toHaveBeenCalled();
  });
});

describe('ScheduleChatPanel - 채팅 이력 조회', () => {
  it('마운트 시 cursor 없이 getScheduleMessages(schedule.id)를 호출한다', async () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    const schedule = buildSchedule('s1', '주간 회의');

    renderPanel({ schedule });

    await waitFor(() => {
      expect(getScheduleMessages).toHaveBeenCalledWith('s1');
    });
  });

  it('이력 조회 응답의 메시지가 목록에 렌더링된다', async () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    vi.mocked(getScheduleMessages).mockResolvedValue({
      data: [buildMessage({ id: 'h1', content: '이전 메시지', senderUserId: 'u1' })],
      nextCursor: null,
      hasMore: false,
    });

    renderPanel();

    expect(await screen.findByText('이전 메시지')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
  });

  it('이력 로딩 중에는 로딩 표시가 나타나고 완료 후 사라진다', async () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    let resolveHistory!: (value: PaginatedChatMessages) => void;
    vi.mocked(getScheduleMessages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveHistory = resolve;
        }),
    );

    renderPanel();

    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();

    await act(async () => {
      resolveHistory(emptyHistoryPage());
    });

    await waitFor(() => {
      expect(screen.queryByText(/불러오는 중/)).not.toBeInTheDocument();
    });
  });

  it('hasMore가 true이면 이전 메시지 더 보기 버튼이 노출된다', async () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    vi.mocked(getScheduleMessages).mockResolvedValue({
      data: [buildMessage({ id: 'h1' })],
      nextCursor: 'c2',
      hasMore: true,
    });

    renderPanel();

    expect(await screen.findByRole('button', { name: '이전 메시지 더 보기' })).toBeInTheDocument();
  });

  it('hasMore가 false이면 이전 메시지 더 보기 버튼이 노출되지 않는다', async () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    vi.mocked(getScheduleMessages).mockResolvedValue({
      data: [buildMessage({ id: 'h1' })],
      nextCursor: null,
      hasMore: false,
    });

    renderPanel();

    await screen.findByText('안녕하세요');
    expect(screen.queryByRole('button', { name: '이전 메시지 더 보기' })).not.toBeInTheDocument();
  });

  it('더보기 버튼 클릭 시 다음 페이지를 조회해 기존 목록 앞에 추가한다', async () => {
    const user = userEvent.setup();
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    vi.mocked(getScheduleMessages).mockResolvedValueOnce({
      data: [buildMessage({ id: 'h2', content: '두번째 페이지 메시지' })],
      nextCursor: 'c2',
      hasMore: true,
    });

    renderPanel({ schedule: buildSchedule('s1', '주간 회의') });

    await screen.findByText('두번째 페이지 메시지');

    vi.mocked(getScheduleMessages).mockResolvedValueOnce({
      data: [buildMessage({ id: 'h1', content: '첫번째 페이지 메시지' })],
      nextCursor: null,
      hasMore: false,
    });

    await user.click(screen.getByRole('button', { name: '이전 메시지 더 보기' }));

    expect(getScheduleMessages).toHaveBeenLastCalledWith('s1', { cursor: 'c2' });

    await screen.findByText('첫번째 페이지 메시지');

    const earlier = screen.getByText('첫번째 페이지 메시지');
    const later = screen.getByText('두번째 페이지 메시지');
    expect(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('다음 페이지 조회 결과 hasMore가 false이면 더보기 버튼이 사라진다', async () => {
    const user = userEvent.setup();
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    vi.mocked(getScheduleMessages).mockResolvedValueOnce({
      data: [buildMessage({ id: 'h1' })],
      nextCursor: 'c2',
      hasMore: true,
    });

    renderPanel();

    await screen.findByRole('button', { name: '이전 메시지 더 보기' });

    vi.mocked(getScheduleMessages).mockResolvedValueOnce({
      data: [buildMessage({ id: 'h0' })],
      nextCursor: null,
      hasMore: false,
    });

    await user.click(screen.getByRole('button', { name: '이전 메시지 더 보기' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '이전 메시지 더 보기' })).not.toBeInTheDocument();
    });
  });

  it('이력 조회가 진행 중일 때 먼저 도착한 실시간 메시지는 이력 응답 반영 후에도 유지되고 중복되지 않는다', async () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    let resolveHistory!: (value: PaginatedChatMessages) => void;
    vi.mocked(getScheduleMessages).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveHistory = resolve;
        }),
    );

    renderPanel();

    const realtimeMessage = buildMessage({ id: 'rt1', content: '실시간 메시지' });
    act(() => {
      lastOnMessage()(realtimeMessage);
    });

    await act(async () => {
      resolveHistory({
        data: [buildMessage({ id: 'h1', content: '이력 메시지' }), realtimeMessage],
        nextCursor: null,
        hasMore: false,
      });
    });

    await screen.findByText('이력 메시지');
    expect(screen.getAllByText('실시간 메시지')).toHaveLength(1);
  });

  it('schedule.id가 변경되면 이력 상태(nextCursor/hasMore/historyError)가 초기화되고 새 일정의 이력을 재조회한다', async () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    const scheduleA = buildSchedule('s1', '주간 회의');
    vi.mocked(getScheduleMessages).mockResolvedValueOnce({
      data: [buildMessage({ id: 'hA' })],
      nextCursor: 'cA',
      hasMore: true,
    });

    const { rerender } = render(
      <ScheduleChatPanel schedule={scheduleA} members={members} isLeader={false} onClose={vi.fn()} onEditClick={vi.fn()} />,
    );

    await screen.findByRole('button', { name: '이전 메시지 더 보기' });
    expect(getScheduleMessages).toHaveBeenCalledWith('s1');

    vi.mocked(getScheduleMessages).mockResolvedValueOnce(emptyHistoryPage());
    const scheduleB = buildSchedule('s2', '월간 회의');
    rerender(
      <ScheduleChatPanel schedule={scheduleB} members={members} isLeader={false} onClose={vi.fn()} onEditClick={vi.fn()} />,
    );

    await waitFor(() => {
      expect(getScheduleMessages).toHaveBeenCalledWith('s2');
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '이전 메시지 더 보기' })).not.toBeInTheDocument();
    });
  });

  it('이력 조회가 403으로 실패하면 권한 없음 안내가 표시되고 입력창/전송버튼이 비활성화(또는 숨김)되지만 일정 상세정보는 정상 렌더링된다', async () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    const error = new ApiError(403, 'NOT_MEMBER', '이 팀의 채팅에 접근할 권한이 없습니다');
    vi.mocked(getScheduleMessages).mockRejectedValue(error);
    const schedule = buildSchedule('s1', '주간 회의');

    renderPanel({ schedule });

    expect(await screen.findByText(/권한이 없습니다/)).toBeInTheDocument();
    expect(screen.getAllByText('주간 회의').length).toBeGreaterThan(0);
    expect(screen.getByText('시작')).toBeInTheDocument();

    const textbox = screen.queryByRole('textbox');
    if (textbox) {
      expect(textbox).toBeDisabled();
    }
    const sendButton = screen.queryByRole('button', { name: '전송' });
    if (sendButton) {
      expect(sendButton).toBeDisabled();
    }
    expect(screen.queryByRole('button', { name: '이전 메시지 더 보기' })).not.toBeInTheDocument();
  });

  it('이력 조회가 404로 실패하면 이력을 찾을 수 없다는 안내가 표시된다', async () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    const error = new ApiError(404, 'NOT_FOUND', '채팅 이력을 찾을 수 없습니다');
    vi.mocked(getScheduleMessages).mockRejectedValue(error);

    renderPanel();

    expect(await screen.findByText(/채팅 이력을 찾을 수 없습니다/)).toBeInTheDocument();
  });
});

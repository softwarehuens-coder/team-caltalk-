import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Schedule, ScheduleParticipant } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';
import type { ChatMessage, PaginatedChatMessages } from '../../../shared/types/chat.types';
import type { ChangeRequest } from '../../../shared/types/change-request.types';
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

vi.mock('../api/change-request.api', () => ({
  submitChangeRequest: vi.fn(),
  approveChangeRequest: vi.fn(),
  rejectChangeRequest: vi.fn(),
  listChangeRequests: vi.fn(),
}));

import { ScheduleChatPanel } from './ScheduleChatPanel';
import { getScheduleMessages } from '../api/chat.api';
import {
  submitChangeRequest,
  approveChangeRequest,
  rejectChangeRequest,
  listChangeRequests,
} from '../api/change-request.api';

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

function buildParticipant(userId: string, overrides: Partial<ScheduleParticipant> = {}): ScheduleParticipant {
  return {
    id: `p-${userId}`,
    scheduleId: 's1',
    userId,
    createdAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildChangeRequest(overrides: Partial<ChangeRequest> = {}): ChangeRequest {
  return {
    id: 'cr1',
    scheduleId: 's1',
    requestedByUserId: 'u2',
    status: 'PENDING',
    desiredStartAt: '2026-04-20T09:00:00.000Z',
    desiredEndAt: '2026-04-20T10:00:00.000Z',
    reason: null,
    createdAt: '2026-04-02T00:00:00.000Z',
    decidedAt: null,
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
  vi.mocked(listChangeRequests).mockResolvedValue([]);
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

describe('ScheduleChatPanel - 변경 요청', () => {
  const currentUser = { id: 'u2', email: 'member@test.com', name: '김철수', createdAt: '2026-01-01T00:00:00.000Z' };

  function scheduleWithParticipant(id = 's1', title = '주간 회의'): Schedule {
    return buildSchedule(id, title, { participants: [buildParticipant('u2', { scheduleId: id })] });
  }

  it('isLeader=true이면 변경 요청 작성 버튼이 노출되지 않는다', () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock, user: currentUser });

    renderPanel({ isLeader: true, schedule: scheduleWithParticipant() });

    expect(screen.queryByRole('button', { name: '변경 요청 작성' })).not.toBeInTheDocument();
  });

  it('isLeader=false이고 참여자가 아니면 변경 요청 작성 버튼이 노출되지 않는다', () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock, user: currentUser });

    renderPanel({ isLeader: false, schedule: buildSchedule('s1', '주간 회의', { participants: [] }) });

    expect(screen.queryByRole('button', { name: '변경 요청 작성' })).not.toBeInTheDocument();
  });

  it('isLeader=false이고 참여자이면 변경 요청 작성 버튼이 노출된다', () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock, user: currentUser });

    renderPanel({ isLeader: false, schedule: scheduleWithParticipant() });

    expect(screen.getByRole('button', { name: '변경 요청 작성' })).toBeInTheDocument();
  });

  it('변경 요청 작성 버튼을 클릭하면 변경 요청 폼 모달이 노출된다', async () => {
    const user = userEvent.setup();
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock, user: currentUser });

    renderPanel({ isLeader: false, schedule: scheduleWithParticipant() });
    await user.click(screen.getByRole('button', { name: '변경 요청 작성' }));

    expect(screen.getByLabelText('희망 시작 일시')).toBeInTheDocument();
    expect(screen.getByLabelText('희망 종료 일시')).toBeInTheDocument();
  });

  it('변경 요청 폼에서 취소를 클릭하면 모달이 닫히고 패널은 유지된다', async () => {
    const user = userEvent.setup();
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock, user: currentUser });

    renderPanel({ isLeader: false, schedule: scheduleWithParticipant() });
    await user.click(screen.getByRole('button', { name: '변경 요청 작성' }));
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByLabelText('희망 시작 일시')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '변경 요청 작성' })).toBeInTheDocument();
  });

  it('변경 요청 제출에 성공하면 모달이 닫히고 대기중 카드가 메시지 목록에 표시된다', async () => {
    const user = userEvent.setup();
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock, user: currentUser });
    const response = buildChangeRequest({
      desiredStartAt: new Date(2026, 3, 20, 9, 0).toISOString(),
      desiredEndAt: new Date(2026, 3, 20, 10, 0).toISOString(),
      reason: '회의실 변경 필요',
    });
    vi.mocked(submitChangeRequest).mockResolvedValue(response);

    renderPanel({ isLeader: false, schedule: scheduleWithParticipant() });
    await user.click(screen.getByRole('button', { name: '변경 요청 작성' }));
    fireEvent.change(screen.getByLabelText('희망 시작 일시'), { target: { value: '2026-04-20T09:00' } });
    fireEvent.change(screen.getByLabelText('희망 종료 일시'), { target: { value: '2026-04-20T10:00' } });
    await user.type(screen.getByLabelText('사유'), '회의실 변경 필요');
    await user.click(screen.getByRole('button', { name: '요청 보내기' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('희망 시작 일시')).not.toBeInTheDocument();
    });
    const cardHeader = await screen.findByText('[변경 요청 - 대기중]');
    const card = within(cardHeader.parentElement as HTMLElement);
    expect(card.getByText('김철수')).toBeInTheDocument();
    expect(card.getByText('회의실 변경 필요')).toBeInTheDocument();
    expect(card.getByText(new Date(response.desiredStartAt).toLocaleString('ko-KR'))).toBeInTheDocument();
    expect(card.getByText(new Date(response.desiredEndAt).toLocaleString('ko-KR'))).toBeInTheDocument();
  });

  it('메시지와 대기중 카드가 createdAt 기준 시간순으로 렌더링된다', async () => {
    const user = userEvent.setup();
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock, user: currentUser });
    vi.mocked(getScheduleMessages).mockResolvedValue({
      data: [
        buildMessage({ id: 'm1', content: '첫 메시지', createdAt: '2026-04-01T00:00:00.000Z' }),
        buildMessage({ id: 'm2', content: '세번째 메시지', createdAt: '2026-04-03T00:00:00.000Z' }),
      ],
      nextCursor: null,
      hasMore: false,
    });
    const response = buildChangeRequest({ createdAt: '2026-04-02T00:00:00.000Z' });
    vi.mocked(submitChangeRequest).mockResolvedValue(response);

    renderPanel({ isLeader: false, schedule: scheduleWithParticipant() });
    await screen.findByText('첫 메시지');
    await user.click(screen.getByRole('button', { name: '변경 요청 작성' }));
    fireEvent.change(screen.getByLabelText('희망 시작 일시'), { target: { value: '2026-04-20T09:00' } });
    fireEvent.change(screen.getByLabelText('희망 종료 일시'), { target: { value: '2026-04-20T10:00' } });
    await user.click(screen.getByRole('button', { name: '요청 보내기' }));

    const first = await screen.findByText('첫 메시지');
    const pendingCard = await screen.findByText('[변경 요청 - 대기중]');
    const third = screen.getByText('세번째 메시지');

    expect(first.compareDocumentPosition(pendingCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pendingCard.compareDocumentPosition(third) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('schedule.id가 변경되면 이전 일정의 대기중 카드가 사라진다', async () => {
    const user = userEvent.setup();
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock, user: currentUser });
    vi.mocked(submitChangeRequest).mockResolvedValue(buildChangeRequest());
    const scheduleA = scheduleWithParticipant('s1', '주간 회의');

    const { rerender } = render(
      <ScheduleChatPanel schedule={scheduleA} members={members} isLeader={false} onClose={vi.fn()} onEditClick={vi.fn()} />,
    );
    await screen.findByText('아직 메시지가 없습니다');
    await user.click(screen.getByRole('button', { name: '변경 요청 작성' }));
    fireEvent.change(screen.getByLabelText('희망 시작 일시'), { target: { value: '2026-04-20T09:00' } });
    fireEvent.change(screen.getByLabelText('희망 종료 일시'), { target: { value: '2026-04-20T10:00' } });
    await user.click(screen.getByRole('button', { name: '요청 보내기' }));
    expect(await screen.findByText('[변경 요청 - 대기중]')).toBeInTheDocument();

    const scheduleB = scheduleWithParticipant('s2', '월간 회의');
    rerender(
      <ScheduleChatPanel schedule={scheduleB} members={members} isLeader={false} onClose={vi.fn()} onEditClick={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.queryByText('[변경 요청 - 대기중]')).not.toBeInTheDocument();
    });
  });
});

describe('ScheduleChatPanel - 변경 요청 승인/거절 (FE-8)', () => {
  const currentUser = { id: 'u2', email: 'member@test.com', name: '김철수', createdAt: '2026-01-01T00:00:00.000Z' };

  beforeEach(() => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock, user: currentUser });
    vi.mocked(getScheduleMessages).mockResolvedValue({
      data: [],
      nextCursor: null,
      hasMore: false,
    });
  });

  afterEach(() => {
    vi.mocked(approveChangeRequest).mockReset();
    vi.mocked(rejectChangeRequest).mockReset();
    vi.mocked(getScheduleMessages).mockReset();
  });

  const scheduleA = buildSchedule('s1', '주간 회의', {
    participants: [buildParticipant('u2', { scheduleId: 's1' })],
  });

  it('isLeader=true 이면 PENDING 변경 요청 카드에 승인 및 거절 버튼이 노출된다', async () => {
    const response = buildChangeRequest({ status: 'PENDING' });
    vi.mocked(submitChangeRequest).mockResolvedValue(response);

    const user = userEvent.setup();
    const { rerender } = render(
      <ScheduleChatPanel
        schedule={scheduleA}
        members={members}
        isLeader={false}
        onClose={vi.fn()}
        onEditClick={vi.fn()}
      />
    );

    // Submit a change request as a member first
    await user.click(screen.getByRole('button', { name: '변경 요청 작성' }));
    fireEvent.change(screen.getByLabelText('희망 시작 일시'), { target: { value: '2026-04-20T09:00' } });
    fireEvent.change(screen.getByLabelText('희망 종료 일시'), { target: { value: '2026-04-20T10:00' } });
    await user.click(screen.getByRole('button', { name: '요청 보내기' }));

    expect(await screen.findByText('[변경 요청 - 대기중]')).toBeInTheDocument();

    // Now rerender as leader to see the approve/reject buttons
    rerender(
      <ScheduleChatPanel
        schedule={scheduleA}
        members={members}
        isLeader={true}
        onClose={vi.fn()}
        onEditClick={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '승인' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '거절' })).toBeInTheDocument();
  });

  it('isLeader=false 이면 PENDING 변경 요청 카드에 승인 및 거절 버튼이 노출되지 않는다', async () => {
    const response = buildChangeRequest({ status: 'PENDING' });
    vi.mocked(submitChangeRequest).mockResolvedValue(response);

    const user = userEvent.setup();
    render(
      <ScheduleChatPanel
        schedule={scheduleA}
        members={members}
        isLeader={false}
        onClose={vi.fn()}
        onEditClick={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '변경 요청 작성' }));
    fireEvent.change(screen.getByLabelText('희망 시작 일시'), { target: { value: '2026-04-20T09:00' } });
    fireEvent.change(screen.getByLabelText('희망 종료 일시'), { target: { value: '2026-04-20T10:00' } });
    await user.click(screen.getByRole('button', { name: '요청 보내기' }));

    expect(await screen.findByText('[변경 요청 - 대기중]')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '승인' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '거절' })).not.toBeInTheDocument();
  });

  it('다른 탭(멤버)이 제출한 PENDING 변경 요청도 서버 조회로 팀장 화면에 처음부터 보인다 (교차 세션 가시성 회귀 테스트)', async () => {
    // 이 테스트는 로컬 state가 아니라 listChangeRequests(GET /schedules/{id}/change-requests) 서버
    // 응답만으로 팀장 화면에 승인/거절 UI가 뜨는지 검증한다 — submitChangeRequest를 이 컴포넌트
    // 인스턴스에서 전혀 호출하지 않는다(= 실제로 다른 브라우저 탭에서 제출된 상황을 재현).
    const pendingFromAnotherTab = buildChangeRequest({ id: 'cr-remote', status: 'PENDING' });
    vi.mocked(listChangeRequests).mockResolvedValue([pendingFromAnotherTab]);

    render(
      <ScheduleChatPanel
        schedule={scheduleA}
        members={members}
        isLeader={true}
        onClose={vi.fn()}
        onEditClick={vi.fn()}
      />
    );

    expect(await screen.findByText('[변경 요청 - 대기중]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '승인' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '거절' })).toBeInTheDocument();
    expect(vi.mocked(submitChangeRequest)).not.toHaveBeenCalled();
  });

  it('승인 클릭 시 approveChangeRequest API가 호출되고 상태가 APPROVED로 변경되며 콜백들이 실행된다', async () => {
    const pendingRequest = buildChangeRequest({ id: 'cr1', status: 'PENDING' });
    const approvedRequest = { ...pendingRequest, status: 'APPROVED' as const };

    vi.mocked(submitChangeRequest).mockResolvedValue(pendingRequest);
    vi.mocked(approveChangeRequest).mockResolvedValue(approvedRequest);

    const onScheduleApprovedMock = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ScheduleChatPanel
        schedule={scheduleA}
        members={members}
        isLeader={false}
        onClose={vi.fn()}
        onEditClick={vi.fn()}
        onScheduleApproved={onScheduleApprovedMock}
      />
    );

    await user.click(screen.getByRole('button', { name: '변경 요청 작성' }));
    fireEvent.change(screen.getByLabelText('희망 시작 일시'), { target: { value: '2026-04-20T09:00' } });
    fireEvent.change(screen.getByLabelText('희망 종료 일시'), { target: { value: '2026-04-20T10:00' } });
    await user.click(screen.getByRole('button', { name: '요청 보내기' }));

    expect(await screen.findByText('[변경 요청 - 대기중]')).toBeInTheDocument();

    // Rerender as leader
    rerender(
      <ScheduleChatPanel
        schedule={scheduleA}
        members={members}
        isLeader={true}
        onClose={vi.fn()}
        onEditClick={vi.fn()}
        onScheduleApproved={onScheduleApprovedMock}
      />
    );

    const approveButton = await screen.findByRole('button', { name: '승인' });
    await user.click(approveButton);

    await waitFor(() => {
      expect(approveChangeRequest).toHaveBeenCalledWith('cr1');
    });
    expect(await screen.findByText('[변경 요청 - 승인됨]')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '승인' })).not.toBeInTheDocument();
    expect(onScheduleApprovedMock).toHaveBeenCalled();
    expect(getScheduleMessages).toHaveBeenCalled();
  });

  it('거절 클릭 후 거절 사유가 비어 있으면 경고를 표시하고 제출을 차단한다', async () => {
    const pendingRequest = buildChangeRequest({ id: 'cr1', status: 'PENDING' });
    vi.mocked(submitChangeRequest).mockResolvedValue(pendingRequest);

    const user = userEvent.setup();
    const { rerender } = render(
      <ScheduleChatPanel
        schedule={scheduleA}
        members={members}
        isLeader={false}
        onClose={vi.fn()}
        onEditClick={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '변경 요청 작성' }));
    fireEvent.change(screen.getByLabelText('희망 시작 일시'), { target: { value: '2026-04-20T09:00' } });
    fireEvent.change(screen.getByLabelText('희망 종료 일시'), { target: { value: '2026-04-20T10:00' } });
    await user.click(screen.getByRole('button', { name: '요청 보내기' }));

    expect(await screen.findByText('[변경 요청 - 대기중]')).toBeInTheDocument();

    // Rerender as leader
    rerender(
      <ScheduleChatPanel
        schedule={scheduleA}
        members={members}
        isLeader={true}
        onClose={vi.fn()}
        onEditClick={vi.fn()}
      />
    );

    const rejectButton = await screen.findByRole('button', { name: '거절' });
    await user.click(rejectButton);

    expect(screen.getByText('거절 사유 (필수)')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: '거절 확정' });
    await user.click(confirmButton);

    expect(screen.getByText('거절 사유를 입력해주세요')).toBeInTheDocument();
    expect(rejectChangeRequest).not.toHaveBeenCalled();
  });

  it('거절 사유를 입력하고 확정하면 rejectChangeRequest API가 호출되고 상태가 REJECTED로 변경된다', async () => {
    const pendingRequest = buildChangeRequest({ id: 'cr1', status: 'PENDING' });
    const rejectedRequest = { ...pendingRequest, status: 'REJECTED' as const };

    vi.mocked(submitChangeRequest).mockResolvedValue(pendingRequest);
    vi.mocked(rejectChangeRequest).mockResolvedValue(rejectedRequest);

    const user = userEvent.setup();
    const { rerender } = render(
      <ScheduleChatPanel
        schedule={scheduleA}
        members={members}
        isLeader={false}
        onClose={vi.fn()}
        onEditClick={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '변경 요청 작성' }));
    fireEvent.change(screen.getByLabelText('희망 시작 일시'), { target: { value: '2026-04-20T09:00' } });
    fireEvent.change(screen.getByLabelText('희망 종료 일시'), { target: { value: '2026-04-20T10:00' } });
    await user.click(screen.getByRole('button', { name: '요청 보내기' }));

    expect(await screen.findByText('[변경 요청 - 대기중]')).toBeInTheDocument();

    // Rerender as leader
    rerender(
      <ScheduleChatPanel
        schedule={scheduleA}
        members={members}
        isLeader={true}
        onClose={vi.fn()}
        onEditClick={vi.fn()}
      />
    );

    const rejectButton = await screen.findByRole('button', { name: '거절' });
    await user.click(rejectButton);

    const textarea = screen.getByPlaceholderText('거절 사유를 입력하세요.');
    await user.type(textarea, '시간 겹침');

    const confirmButton = screen.getByRole('button', { name: '거절 확정' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(rejectChangeRequest).toHaveBeenCalledWith('cr1', { reason: '시간 겹침' });
    });
    expect(await screen.findByText('[변경 요청 - 거절됨]')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '승인' })).not.toBeInTheDocument();
    expect(getScheduleMessages).toHaveBeenCalled();
  });

  it('이미 처리된 경우(409)에는 에러 메시지를 표시하고 액션을 비활성화한다', async () => {
    const pendingRequest = buildChangeRequest({ id: 'cr1', status: 'PENDING' });
    vi.mocked(submitChangeRequest).mockResolvedValue(pendingRequest);
    vi.mocked(approveChangeRequest).mockRejectedValue(new ApiError(409, 'ALREADY_DECIDED', '이미 결정된 요청입니다.'));

    const user = userEvent.setup();
    const { rerender } = render(
      <ScheduleChatPanel
        schedule={scheduleA}
        members={members}
        isLeader={false}
        onClose={vi.fn()}
        onEditClick={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: '변경 요청 작성' }));
    fireEvent.change(screen.getByLabelText('희망 시작 일시'), { target: { value: '2026-04-20T09:00' } });
    fireEvent.change(screen.getByLabelText('희망 종료 일시'), { target: { value: '2026-04-20T10:00' } });
    await user.click(screen.getByRole('button', { name: '요청 보내기' }));

    expect(await screen.findByText('[변경 요청 - 대기중]')).toBeInTheDocument();

    // Rerender as leader
    rerender(
      <ScheduleChatPanel
        schedule={scheduleA}
        members={members}
        isLeader={true}
        onClose={vi.fn()}
        onEditClick={vi.fn()}
      />
    );

    const approveButton = await screen.findByRole('button', { name: '승인' });
    await user.click(approveButton);

    expect(await screen.findByText('이미 결정된 요청입니다.')).toBeInTheDocument();
  });
});

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Schedule } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';
import type { ChatMessage } from '../../../shared/types/chat.types';

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

import { ScheduleChatPanel } from './ScheduleChatPanel';

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

  it('메시지가 없으면 안내 문구를 표시한다', () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });

    renderPanel();

    expect(screen.getByText('아직 메시지가 없습니다')).toBeInTheDocument();
  });

  it('onMessage 콜백이 호출되면 메시지 목록에 발신자 이름과 함께 추가된다', () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    renderPanel();
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

  it('schedule.id가 변경되면 메시지 목록이 초기화되어 이전 일정의 메시지와 섞이지 않는다', () => {
    setupChatSocket('open');
    useAuthMock.mockReturnValue({ token: 't', logout: logoutMock });
    const scheduleA = buildSchedule('s1', '주간 회의');
    const { rerender } = render(
      <ScheduleChatPanel schedule={scheduleA} members={members} isLeader={false} onClose={vi.fn()} onEditClick={vi.fn()} />,
    );

    act(() => {
      lastOnMessage()(buildMessage({ id: 'm1', content: 'A 일정 메시지' }));
    });
    expect(screen.getByText('A 일정 메시지')).toBeInTheDocument();

    const scheduleB = buildSchedule('s2', '월간 회의');
    rerender(
      <ScheduleChatPanel schedule={scheduleB} members={members} isLeader={false} onClose={vi.fn()} onEditClick={vi.fn()} />,
    );

    expect(screen.queryByText('A 일정 메시지')).not.toBeInTheDocument();

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

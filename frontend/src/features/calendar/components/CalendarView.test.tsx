import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '../../../shared/api/api-error';
import type { Schedule } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';

const useAuthMock = vi.fn();
const useCurrentTeamMock = vi.fn();
const useTeamMembersMock = vi.fn();
const useCalendarNavigationMock = vi.fn();
const useTeamSchedulesMock = vi.fn();

vi.mock('../../auth/hooks/use-auth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../team/hooks/use-current-team', () => ({
  useCurrentTeam: () => useCurrentTeamMock(),
}));

vi.mock('../../team/hooks/use-team-members', () => ({
  useTeamMembers: (...args: unknown[]) => useTeamMembersMock(...args),
}));

vi.mock('../hooks/use-calendar-navigation', () => ({
  useCalendarNavigation: () => useCalendarNavigationMock(),
}));

vi.mock('../hooks/use-team-schedules', () => ({
  useTeamSchedules: (...args: unknown[]) => useTeamSchedulesMock(...args),
}));

vi.mock('./CalendarToolbar', () => ({
  CalendarToolbar: (props: { view: string; isLeader: boolean; onCreateClick?: () => void }) => (
    <div data-testid="toolbar" data-view={props.view} data-leader={String(props.isLeader)}>
      {props.isLeader && (
        <button type="button" onClick={props.onCreateClick}>
          생성
        </button>
      )}
    </div>
  ),
}));

vi.mock('./MonthGrid', () => ({
  MonthGrid: (props: { schedulesByDay: Map<string, Schedule[]>; onScheduleClick(schedule: Schedule): void }) => (
    <div data-testid="month-grid">
      {Array.from(props.schedulesByDay.values())
        .flat()
        .map((schedule) => (
          <button key={schedule.id} type="button" onClick={() => props.onScheduleClick(schedule)}>
            {schedule.title}
          </button>
        ))}
    </div>
  ),
}));

vi.mock('./AgendaListView', () => ({
  AgendaListView: () => <div data-testid="agenda-view" />,
}));

vi.mock('../../chat/components/ScheduleChatPanel', () => ({
  ScheduleChatPanel: (props: {
    schedule: Schedule;
    isLeader: boolean;
    onClose(): void;
    onEditClick(schedule: Schedule): void;
  }) => (
    <div data-testid="chat-panel" data-schedule-id={props.schedule.id} data-leader={String(props.isLeader)}>
      <button type="button" onClick={() => props.onEditClick(props.schedule)}>
        패널수정
      </button>
      <button type="button" onClick={() => props.onClose()}>
        패널닫기
      </button>
    </div>
  ),
}));

vi.mock('./ScheduleForm', () => ({
  ScheduleForm: (props: {
    teamId: string;
    mode: 'create' | 'edit';
    schedule?: Schedule | null;
    onSaved(schedule: Schedule, hasConflicts?: boolean): void;
    onDeleted?(scheduleId: string): void;
    onCancel(): void;
  }) => (
    <div data-testid="schedule-form" data-mode={props.mode} data-schedule-id={props.schedule ? props.schedule.id : ''}>
      <button
        type="button"
        onClick={() =>
          props.onSaved({
            id: props.schedule ? props.schedule.id : 'new-id',
            teamId: props.teamId,
            title: '저장됨',
            startAt: '2026-04-15T00:00:00.000Z',
            endAt: '2026-04-15T01:00:00.000Z',
            createdAt: '2026-04-01T00:00:00.000Z',
            deletedAt: null,
            participants: [],
          })
        }
      >
        저장
      </button>
      <button
        type="button"
        onClick={() =>
          props.onSaved(
            {
              id: props.schedule ? props.schedule.id : 'new-id',
              teamId: props.teamId,
              title: '저장됨(충돌)',
              startAt: '2026-04-15T00:00:00.000Z',
              endAt: '2026-04-15T01:00:00.000Z',
              createdAt: '2026-04-01T00:00:00.000Z',
              deletedAt: null,
              participants: [],
            },
            true,
          )
        }
      >
        저장(충돌)
      </button>
      <button
        type="button"
        onClick={() => props.onDeleted && props.onDeleted(props.schedule ? props.schedule.id : '')}
      >
        삭제
      </button>
      <button type="button" onClick={() => props.onCancel()}>
        취소
      </button>
    </div>
  ),
}));

import { CalendarView } from './CalendarView';

const authUser = { id: 'u1', email: 'user@test.com', name: '홍길동', createdAt: '2026-01-01T00:00:00.000Z' };

const defaultNav = {
  view: 'month' as const,
  anchorDate: new Date(2026, 3, 15),
  periodLabel: '2026년 4월',
  dateParam: '2026-04-15',
  setView: vi.fn(),
  goPrev: vi.fn(),
  goNext: vi.fn(),
  goToday: vi.fn(),
};

function leaderMember(role: 'LEADER' | 'MEMBER' = 'LEADER'): TeamMember {
  return { userId: 'u1', email: 'user@test.com', name: '홍길동', role, joinedAt: '2026-01-01T00:00:00.000Z' };
}

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

function setupDefaults() {
  const refresh = vi.fn();
  useAuthMock.mockReturnValue({ user: authUser, token: 't', status: 'authenticated', login: vi.fn(), logout: vi.fn() });
  useCurrentTeamMock.mockReturnValue({ team: { id: 't1', name: '프론트팀' }, setTeam: vi.fn(), clearTeam: vi.fn() });
  useTeamMembersMock.mockReturnValue({ members: [leaderMember()], isLoading: false, error: null, refresh: vi.fn() });
  useCalendarNavigationMock.mockReturnValue(defaultNav);
  useTeamSchedulesMock.mockReturnValue({ schedules: [], isLoading: false, error: null, refresh });
  return { refresh };
}

function renderView() {
  return render(
    <MemoryRouter>
      <CalendarView />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('CalendarView', () => {
  it('team이 없으면 팀 관리 페이지 안내 링크를 렌더링한다', () => {
    setupDefaults();
    useCurrentTeamMock.mockReturnValue({ team: null, setTeam: vi.fn(), clearTeam: vi.fn() });

    renderView();

    expect(screen.getByText('먼저 팀을 생성하거나 가입해주세요.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '팀 관리로 이동' })).toHaveAttribute('href', '/team');
    expect(screen.queryByTestId('month-grid')).not.toBeInTheDocument();
  });

  it('멤버 조회가 403으로 실패하면 접근 불가 안내를 렌더링한다', () => {
    setupDefaults();
    useTeamMembersMock.mockReturnValue({
      members: [],
      isLoading: false,
      error: new ApiError(403, 'NOT_MEMBER', '팀 멤버가 아닙니다'),
      refresh: vi.fn(),
    });

    renderView();

    expect(screen.getByText('이 팀의 캘린더에 접근할 권한이 없습니다.')).toBeInTheDocument();
  });

  it('일정 조회가 403으로 실패하면 접근 불가 안내를 렌더링한다', () => {
    setupDefaults();
    useTeamSchedulesMock.mockReturnValue({
      schedules: [],
      isLoading: false,
      error: new ApiError(403, 'NOT_MEMBER', '팀 멤버가 아닙니다'),
      refresh: vi.fn(),
    });

    renderView();

    expect(screen.getByText('이 팀의 캘린더에 접근할 권한이 없습니다.')).toBeInTheDocument();
  });

  it('로그인 사용자가 LEADER이면 CalendarToolbar에 isLeader=true를 전달한다', () => {
    setupDefaults();
    useTeamMembersMock.mockReturnValue({ members: [leaderMember('LEADER')], isLoading: false, error: null, refresh: vi.fn() });

    renderView();

    expect(screen.getByTestId('toolbar')).toHaveAttribute('data-leader', 'true');
  });

  it('로그인 사용자가 MEMBER이면 CalendarToolbar에 isLeader=false를 전달한다', () => {
    setupDefaults();
    useTeamMembersMock.mockReturnValue({ members: [leaderMember('MEMBER')], isLoading: false, error: null, refresh: vi.fn() });

    renderView();

    expect(screen.getByTestId('toolbar')).toHaveAttribute('data-leader', 'false');
  });

  it('useCalendarNavigation의 view/dateParam으로 useTeamSchedules를 호출한다', () => {
    setupDefaults();
    useCalendarNavigationMock.mockReturnValue({ ...defaultNav, view: 'week', dateParam: '2026-04-12' });

    renderView();

    expect(useTeamSchedulesMock).toHaveBeenCalledWith('t1', 'week', '2026-04-12');
  });

  it('view가 month가 아니면 MonthGrid 대신 AgendaListView를 렌더링한다', () => {
    setupDefaults();
    useCalendarNavigationMock.mockReturnValue({ ...defaultNav, view: 'day', dateParam: '2026-04-15' });

    renderView();

    expect(screen.queryByTestId('month-grid')).not.toBeInTheDocument();
    expect(screen.getByTestId('agenda-view')).toBeInTheDocument();
  });

  it('deletedAt이 설정된 일정은 화면에 노출되지 않는다(방어적)', () => {
    setupDefaults();
    const deletedSchedule = buildSchedule('s1', '삭제된 일정', { deletedAt: '2026-04-10T00:00:00.000Z' });
    const activeSchedule = buildSchedule('s2', '정상 일정');
    useTeamSchedulesMock.mockReturnValue({
      schedules: [deletedSchedule, activeSchedule],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderView();

    expect(screen.queryByText('삭제된 일정')).not.toBeInTheDocument();
    expect(screen.getByText('정상 일정')).toBeInTheDocument();
  });

  it('LEADER가 생성 버튼을 클릭하면 mode=create로 ScheduleForm을 렌더링한다', async () => {
    const user = userEvent.setup();
    setupDefaults();
    renderView();

    expect(screen.queryByTestId('schedule-form')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '생성' }));

    expect(screen.getByTestId('schedule-form')).toHaveAttribute('data-mode', 'create');
  });

  it('일정을 클릭하면 역할과 무관하게 ScheduleChatPanel을 렌더링하고 selectedScheduleId에 매칭되는 일정을 전달한다', async () => {
    const user = userEvent.setup();
    setupDefaults();
    useTeamMembersMock.mockReturnValue({ members: [leaderMember('MEMBER')], isLoading: false, error: null, refresh: vi.fn() });
    const schedule = buildSchedule('s1', '주간 회의');
    useTeamSchedulesMock.mockReturnValue({ schedules: [schedule], isLoading: false, error: null, refresh: vi.fn() });

    renderView();

    expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '주간 회의' }));

    const panel = screen.getByTestId('chat-panel');
    expect(panel).toHaveAttribute('data-schedule-id', 's1');
  });

  it('ScheduleChatPanel의 onEditClick이 호출되면 mode=edit으로 ScheduleForm이 열린다', async () => {
    const user = userEvent.setup();
    setupDefaults();
    const schedule = buildSchedule('s1', '주간 회의');
    useTeamSchedulesMock.mockReturnValue({ schedules: [schedule], isLoading: false, error: null, refresh: vi.fn() });

    renderView();

    await user.click(screen.getByRole('button', { name: '주간 회의' }));
    await user.click(screen.getByRole('button', { name: '패널수정' }));

    const form = screen.getByTestId('schedule-form');
    expect(form).toHaveAttribute('data-mode', 'edit');
    expect(form).toHaveAttribute('data-schedule-id', 's1');
  });

  it('ScheduleChatPanel의 onClose가 호출되면 패널이 닫힌다', async () => {
    const user = userEvent.setup();
    setupDefaults();
    const schedule = buildSchedule('s1', '주간 회의');
    useTeamSchedulesMock.mockReturnValue({ schedules: [schedule], isLoading: false, error: null, refresh: vi.fn() });

    renderView();

    await user.click(screen.getByRole('button', { name: '주간 회의' }));
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '패널닫기' }));

    expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument();
  });

  it('ScheduleForm의 onSaved가 호출되면 refresh를 호출하고 폼을 닫는다', async () => {
    const user = userEvent.setup();
    const { refresh } = setupDefaults();
    renderView();

    await user.click(screen.getByRole('button', { name: '생성' }));
    expect(screen.getByTestId('schedule-form')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('schedule-form')).not.toBeInTheDocument();
  });

  it('ScheduleForm의 onSaved가 hasConflicts=true로 호출되면 폼을 닫지 않고 mode를 edit으로 전환해 재저장 시 중복 생성을 막는다', async () => {
    const user = userEvent.setup();
    const { refresh } = setupDefaults();
    renderView();

    await user.click(screen.getByRole('button', { name: '생성' }));
    expect(screen.getByTestId('schedule-form')).toHaveAttribute('data-mode', 'create');

    await user.click(screen.getByRole('button', { name: '저장(충돌)' }));

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
    const form = screen.getByTestId('schedule-form');
    expect(form).toBeInTheDocument();
    expect(form).toHaveAttribute('data-mode', 'edit');
    expect(form).toHaveAttribute('data-schedule-id', 'new-id');
  });

  it('ScheduleForm의 onDeleted가 호출되면 refresh를 호출하고 폼을 닫는다', async () => {
    const user = userEvent.setup();
    const { refresh } = setupDefaults();
    const schedule = buildSchedule('s1', '주간 회의');
    useTeamSchedulesMock.mockReturnValue({ schedules: [schedule], isLoading: false, error: null, refresh });

    renderView();

    await user.click(screen.getByRole('button', { name: '주간 회의' }));
    await user.click(screen.getByRole('button', { name: '패널수정' }));
    expect(screen.getByTestId('schedule-form')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('schedule-form')).not.toBeInTheDocument();
  });

  it('ScheduleForm의 onCancel이 호출되면 refresh 없이 폼만 닫힌다', async () => {
    const user = userEvent.setup();
    const { refresh } = setupDefaults();
    renderView();

    await user.click(screen.getByRole('button', { name: '생성' }));
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByTestId('schedule-form')).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});

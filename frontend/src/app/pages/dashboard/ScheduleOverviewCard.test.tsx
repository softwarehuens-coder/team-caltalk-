import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Schedule } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';

const useAuthMock = vi.fn();
const useCurrentTeamMock = vi.fn();
const useTeamSchedulesMock = vi.fn();
const useTeamMembersMock = vi.fn();

vi.mock('../../../features/auth/hooks/use-auth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../../features/team/hooks/use-current-team', () => ({
  useCurrentTeam: () => useCurrentTeamMock(),
}));

vi.mock('../../../features/team/hooks/use-team-members', () => ({
  useTeamMembers: (...args: unknown[]) => useTeamMembersMock(...args),
}));

vi.mock('../../../features/calendar/hooks/use-team-schedules', () => ({
  useTeamSchedules: (...args: unknown[]) => useTeamSchedulesMock(...args),
}));

import { ScheduleOverviewCard } from './ScheduleOverviewCard';

const authUser = { id: 'u1', email: 'user@test.com', name: '지훈', createdAt: '2026-01-01T00:00:00.000Z' };

const members: TeamMember[] = [
  { userId: 'u1', email: 'u1@test.com', name: '지훈', role: 'LEADER', joinedAt: '2026-01-01T00:00:00.000Z' },
  { userId: 'u2', email: 'u2@test.com', name: '서연', role: 'MEMBER', joinedAt: '2026-01-05T00:00:00.000Z' },
];

function buildSchedule(id: string, overrides: Partial<Schedule> = {}): Schedule {
  return {
    id,
    teamId: 't1',
    title: '주간 정기 회의',
    startAt: new Date(2026, 3, 15, 10).toISOString(),
    endAt: new Date(2026, 3, 15, 11).toISOString(),
    createdAt: '2026-04-01T00:00:00.000Z',
    deletedAt: null,
    participants: [
      { id: 'p1', scheduleId: id, userId: 'u1', createdAt: '2026-04-01T00:00:00.000Z' },
      { id: 'p2', scheduleId: id, userId: 'u2', createdAt: '2026-04-01T00:00:00.000Z' },
    ],
    ...overrides,
  };
}

function renderCard() {
  return render(
    <MemoryRouter>
      <ScheduleOverviewCard />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 3, 15));
  useAuthMock.mockReturnValue({ user: authUser });
  useTeamMembersMock.mockReturnValue({ members, isLoading: false, error: null, refresh: vi.fn() });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('ScheduleOverviewCard', () => {
  it('소속된 팀이 없으면 팀 관리 안내를 렌더링하고 일정 조회를 호출하지 않는다', () => {
    useCurrentTeamMock.mockReturnValue({ team: null, setTeam: vi.fn(), clearTeam: vi.fn() });
    useTeamSchedulesMock.mockReturnValue({ schedules: [], isLoading: false, error: null, refresh: vi.fn() });

    renderCard();

    expect(screen.getByRole('link', { name: '팀 관리로 이동' })).toHaveAttribute('href', '/team');
  });

  it('이번 달의 모든 일정을 시간/참여인원/이름과 함께 표시한다', () => {
    useCurrentTeamMock.mockReturnValue({ team: { id: 't1', name: '프론트팀' }, setTeam: vi.fn(), clearTeam: vi.fn() });
    useTeamSchedulesMock.mockReturnValue({
      schedules: [
        buildSchedule('s1'),
        buildSchedule('s2', {
          title: '고객사 미팅',
          startAt: new Date(2026, 3, 20, 14).toISOString(),
          endAt: new Date(2026, 3, 20, 15).toISOString(),
          participants: [{ id: 'p3', scheduleId: 's2', userId: 'u1', createdAt: '2026-04-01T00:00:00.000Z' }],
        }),
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderCard();

    expect(screen.getByText('주간 정기 회의')).toBeInTheDocument();
    expect(screen.getByText(/10:00 ~ 11:00/)).toBeInTheDocument();
    expect(screen.getByText(/참여 2명.*지훈, 서연/)).toBeInTheDocument();

    expect(screen.getByText('고객사 미팅')).toBeInTheDocument();
    expect(screen.getByText(/14:00 ~ 15:00/)).toBeInTheDocument();
    expect(screen.getByText(/참여 1명.*지훈/)).toBeInTheDocument();

    expect(screen.getByText('4월 일정 2건')).toBeInTheDocument();
  });

  it('여러 날에 걸친 일정은 시작일~종료일로 표시한다', () => {
    useCurrentTeamMock.mockReturnValue({ team: { id: 't1', name: '프론트팀' }, setTeam: vi.fn(), clearTeam: vi.fn() });
    useTeamSchedulesMock.mockReturnValue({
      schedules: [
        buildSchedule('s1', {
          title: '출장',
          startAt: new Date(2026, 3, 21, 9).toISOString(),
          endAt: new Date(2026, 3, 24, 18).toISOString(),
        }),
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderCard();

    expect(screen.getByText('4월 21일 ~ 4월 24일')).toBeInTheDocument();
  });

  it('이번 달에 일정이 없으면 안내 문구를 표시한다', () => {
    useCurrentTeamMock.mockReturnValue({ team: { id: 't1', name: '프론트팀' }, setTeam: vi.fn(), clearTeam: vi.fn() });
    useTeamSchedulesMock.mockReturnValue({ schedules: [], isLoading: false, error: null, refresh: vi.fn() });

    renderCard();

    expect(screen.getByText('이번 달에 등록된 일정이 없습니다.')).toBeInTheDocument();
  });
});

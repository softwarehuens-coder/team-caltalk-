import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Schedule } from '../../../shared/types/schedule.types';

const useAuthMock = vi.fn();
const useCurrentTeamMock = vi.fn();
const useTeamSchedulesMock = vi.fn();

vi.mock('../../../features/auth/hooks/use-auth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../../features/team/hooks/use-current-team', () => ({
  useCurrentTeam: () => useCurrentTeamMock(),
}));

vi.mock('../../../features/calendar/hooks/use-team-schedules', () => ({
  useTeamSchedules: (...args: unknown[]) => useTeamSchedulesMock(...args),
}));

import { ScheduleOverviewCard } from './ScheduleOverviewCard';

const authUser = { id: 'u1', email: 'user@test.com', name: '지훈', createdAt: '2026-01-01T00:00:00.000Z' };

function buildSchedule(id: string, overrides: Partial<Schedule> = {}): Schedule {
  return {
    id,
    teamId: 't1',
    title: '주간 정기 회의',
    startAt: new Date(2026, 3, 15, 10).toISOString(),
    endAt: new Date(2026, 3, 15, 11).toISOString(),
    createdAt: '2026-04-01T00:00:00.000Z',
    deletedAt: null,
    participants: [{ id: 'p1', scheduleId: id, userId: 'u1', createdAt: '2026-04-01T00:00:00.000Z' }],
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

  it('선택한 날짜(기본값 오늘)에 해당하는 일정의 시간과 참여인원을 표시한다', () => {
    useCurrentTeamMock.mockReturnValue({ team: { id: 't1', name: '프론트팀' }, setTeam: vi.fn(), clearTeam: vi.fn() });
    useTeamSchedulesMock.mockReturnValue({
      schedules: [buildSchedule('s1')],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderCard();

    expect(screen.getByText('주간 정기 회의')).toBeInTheDocument();
    expect(screen.getByText(/10:00 ~ 11:00/)).toBeInTheDocument();
    expect(screen.getByText(/참여 1명/)).toBeInTheDocument();
  });

  it('선택한 날짜에 일정이 없으면 안내 문구를 표시한다', () => {
    useCurrentTeamMock.mockReturnValue({ team: { id: 't1', name: '프론트팀' }, setTeam: vi.fn(), clearTeam: vi.fn() });
    useTeamSchedulesMock.mockReturnValue({ schedules: [], isLoading: false, error: null, refresh: vi.fn() });

    renderCard();

    expect(screen.getByText('이 날짜에 등록된 일정이 없습니다.')).toBeInTheDocument();
  });
});

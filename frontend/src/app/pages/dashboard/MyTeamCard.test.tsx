import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { TeamMember } from '../../../shared/types/team.types';

const useAuthMock = vi.fn();
const useCurrentTeamMock = vi.fn();
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

import { MyTeamCard } from './MyTeamCard';

const authUser = { id: 'u1', email: 'user@test.com', name: '지훈', createdAt: '2026-01-01T00:00:00.000Z' };

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    userId: 'u1',
    email: 'user@test.com',
    name: '지훈',
    role: 'LEADER',
    joinedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderCard() {
  return render(
    <MemoryRouter>
      <MyTeamCard />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('MyTeamCard', () => {
  it('소속된 팀이 없으면 팀 관리로 이동하는 안내를 렌더링한다', () => {
    useAuthMock.mockReturnValue({ user: authUser });
    useCurrentTeamMock.mockReturnValue({ team: null, setTeam: vi.fn(), clearTeam: vi.fn() });
    useTeamMembersMock.mockReturnValue({ members: [], isLoading: false, error: null, refresh: vi.fn() });

    renderCard();

    expect(screen.getByRole('link', { name: '팀 생성하거나 가입하기' })).toHaveAttribute('href', '/team');
  });

  it('팀이 있으면 팀 이름과 내 가입일, 구성원 목록을 렌더링한다', () => {
    useAuthMock.mockReturnValue({ user: authUser });
    useCurrentTeamMock.mockReturnValue({
      team: { id: 't1', name: 'MyApp 개발 팀1' },
      setTeam: vi.fn(),
      clearTeam: vi.fn(),
    });
    useTeamMembersMock.mockReturnValue({
      members: [member(), member({ userId: 'u2', name: '서연', role: 'MEMBER', joinedAt: '2026-03-05T00:00:00.000Z' })],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    renderCard();

    expect(screen.getByText('MyApp 개발 팀1')).toBeInTheDocument();
    expect(screen.getByText(/가입일/)).toBeInTheDocument();
    expect(screen.getByText('지훈')).toBeInTheDocument();
    expect(screen.getByText('(나)')).toBeInTheDocument();
    expect(screen.getByText('서연')).toBeInTheDocument();
  });
});

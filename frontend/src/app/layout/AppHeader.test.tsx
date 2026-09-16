import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const useAuthMock = vi.fn();
const useCurrentTeamMock = vi.fn();

vi.mock('../../features/auth/hooks/use-auth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../features/team/hooks/use-current-team', () => ({
  useCurrentTeam: () => useCurrentTeamMock(),
}));

import { AppHeader } from './AppHeader';

const user = { id: 'u1', email: 'user@test.com', name: '원형섭', createdAt: '2026-01-01T00:00:00.000Z' };

function renderHeader(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppHeader />
    </MemoryRouter>,
  );
}

afterEach(() => {
  useAuthMock.mockReset();
  useCurrentTeamMock.mockReset();
});

describe('AppHeader', () => {
  it('로고, 네비게이션 링크, 사용자명, 로그아웃 버튼을 렌더링한다', () => {
    useAuthMock.mockReturnValue({ user, logout: vi.fn() });
    useCurrentTeamMock.mockReturnValue({ team: null, setTeam: vi.fn(), clearTeam: vi.fn() });

    renderHeader();

    expect(screen.getByText('팀캘톡')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '대시보드' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '팀' })).toHaveAttribute('href', '/team');
    expect(screen.getByRole('link', { name: '캘린더' })).toHaveAttribute('href', '/calendar');
    expect(screen.getByText('원형섭님')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });

  it('선택된 팀이 있으면 팀 이름 배지를 렌더링한다', () => {
    useAuthMock.mockReturnValue({ user, logout: vi.fn() });
    useCurrentTeamMock.mockReturnValue({ team: { id: 't1', name: 'MyApp 개발 팀1' }, setTeam: vi.fn(), clearTeam: vi.fn() });

    renderHeader();

    expect(screen.getByText('MyApp 개발 팀1')).toBeInTheDocument();
  });

  it('선택된 팀이 없으면 팀 배지를 렌더링하지 않는다', () => {
    useAuthMock.mockReturnValue({ user, logout: vi.fn() });
    useCurrentTeamMock.mockReturnValue({ team: null, setTeam: vi.fn(), clearTeam: vi.fn() });

    renderHeader();

    expect(screen.queryByText('MyApp 개발 팀1')).not.toBeInTheDocument();
  });

  it('로그아웃 버튼을 클릭하면 logout이 호출된다', async () => {
    const events = userEvent.setup();
    const logout = vi.fn();
    useAuthMock.mockReturnValue({ user, logout });
    useCurrentTeamMock.mockReturnValue({ team: null, setTeam: vi.fn(), clearTeam: vi.fn() });

    renderHeader();
    await events.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('현재 경로에 해당하는 네비게이션 링크를 aria-current="page"로 표시한다', () => {
    useAuthMock.mockReturnValue({ user, logout: vi.fn() });
    useCurrentTeamMock.mockReturnValue({ team: null, setTeam: vi.fn(), clearTeam: vi.fn() });

    renderHeader('/team');

    expect(screen.getByRole('link', { name: '팀' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '대시보드' })).not.toHaveAttribute('aria-current');
  });
});

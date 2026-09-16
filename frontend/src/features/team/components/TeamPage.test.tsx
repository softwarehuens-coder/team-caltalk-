import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Team } from '../../../shared/types/team.types';

const useCurrentTeamMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../hooks/use-current-team', () => ({
  useCurrentTeam: () => useCurrentTeamMock(),
}));

vi.mock('../../auth/hooks/use-auth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('./CreateTeamForm', () => ({
  CreateTeamForm: ({ onCreated }: { onCreated: (team: Team) => void }) => (
    <button onClick={() => onCreated({ id: 't1', name: '프론트팀', createdAt: '2026-01-01T00:00:00.000Z' })}>
      create-team-stub
    </button>
  ),
}));

vi.mock('./JoinTeamForm', () => ({
  JoinTeamForm: ({ onJoined }: { onJoined?: (team: Team) => void }) => (
    <div data-testid="join-form">
      join
      <button onClick={() => onJoined?.({ id: 't1', name: '프론트팀', createdAt: '2026-01-01T00:00:00.000Z' })}>
        join-form-joined-stub
      </button>
    </div>
  ),
}));

vi.mock('./TeamDashboard', () => ({
  TeamDashboard: ({ onTeamCleared }: { onTeamCleared: () => void }) => (
    <button onClick={onTeamCleared}>clear-team-stub</button>
  ),
}));

import { TeamPage } from './TeamPage';

afterEach(() => {
  useCurrentTeamMock.mockReset();
  useAuthMock.mockReset();
});

beforeEach(() => {
  useAuthMock.mockReturnValue({
    user: { id: 'user-1', email: 'user@example.com', name: '사용자', createdAt: '2026-01-01T00:00:00.000Z' },
    token: 't',
    status: 'authenticated',
    login: vi.fn(),
    logout: vi.fn(),
  });
});

function renderTeamPage(): void {
  render(
    <MemoryRouter initialEntries={['/team']}>
      <Routes>
        <Route path="/" element={<div>캘린더 화면</div>} />
        <Route path="/team" element={<TeamPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TeamPage', () => {
  it('team이 없으면 CreateTeamForm과 JoinTeamForm을 렌더링하고 TeamDashboard는 렌더링하지 않는다', () => {
    useCurrentTeamMock.mockReturnValue({ team: null, setTeam: vi.fn(), clearTeam: vi.fn() });

    renderTeamPage();

    expect(screen.getByText('create-team-stub')).toBeInTheDocument();
    expect(screen.getByTestId('join-form')).toBeInTheDocument();
    expect(screen.queryByText('clear-team-stub')).not.toBeInTheDocument();
  });

  it('CreateTeamForm에서 팀이 생성되면 setTeam이 호출된다', async () => {
    const user = userEvent.setup();
    const setTeam = vi.fn();
    useCurrentTeamMock.mockReturnValue({ team: null, setTeam, clearTeam: vi.fn() });

    renderTeamPage();
    await user.click(screen.getByText('create-team-stub'));

    expect(setTeam).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', name: '프론트팀' }));
    // 팀장은 팀 생성 직후 이 화면에 남아 팀원 초대/승인을 계속 진행해야 하므로
    // 캘린더로 자동 이동하지 않는다.
    expect(screen.queryByText('캘린더 화면')).not.toBeInTheDocument();
  });

  it('JoinTeamForm에서 가입 승인이 확인되면(onJoined) setTeam을 호출하고 캘린더 화면으로 자동 이동한다 (팀원이 승인 후 캘린더로 못 넘어가던 버그 회귀 테스트)', async () => {
    const user = userEvent.setup();
    const setTeam = vi.fn();
    useCurrentTeamMock.mockReturnValue({ team: null, setTeam, clearTeam: vi.fn() });

    renderTeamPage();
    await user.click(screen.getByText('join-form-joined-stub'));

    expect(setTeam).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', name: '프론트팀' }));
    expect(await screen.findByText('캘린더 화면')).toBeInTheDocument();
  });

  it('team이 있으면 TeamDashboard를 렌더링하고 CreateTeamForm/JoinTeamForm은 렌더링하지 않는다', () => {
    useCurrentTeamMock.mockReturnValue({
      team: { id: 't1', name: '프론트팀' },
      setTeam: vi.fn(),
      clearTeam: vi.fn(),
    });

    renderTeamPage();

    expect(screen.getByText('clear-team-stub')).toBeInTheDocument();
    expect(screen.queryByText('create-team-stub')).not.toBeInTheDocument();
    expect(screen.queryByTestId('join-form')).not.toBeInTheDocument();
  });

  it('TeamDashboard에서 onTeamCleared가 호출되면 clearTeam이 호출된다', async () => {
    const user = userEvent.setup();
    const clearTeam = vi.fn();
    useCurrentTeamMock.mockReturnValue({
      team: { id: 't1', name: '프론트팀' },
      setTeam: vi.fn(),
      clearTeam,
    });

    renderTeamPage();
    await user.click(screen.getByText('clear-team-stub'));

    expect(clearTeam).toHaveBeenCalledTimes(1);
  });
});

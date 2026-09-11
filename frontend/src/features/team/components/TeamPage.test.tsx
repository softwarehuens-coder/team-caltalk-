import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Team } from '../../../shared/types/team.types';

const useCurrentTeamMock = vi.fn();

vi.mock('../hooks/use-current-team', () => ({
  useCurrentTeam: () => useCurrentTeamMock(),
}));

vi.mock('./CreateTeamForm', () => ({
  CreateTeamForm: ({ onCreated }: { onCreated: (team: Team) => void }) => (
    <button onClick={() => onCreated({ id: 't1', name: '프론트팀', createdAt: '2026-01-01T00:00:00.000Z' })}>
      create-team-stub
    </button>
  ),
}));

vi.mock('./JoinTeamForm', () => ({
  JoinTeamForm: () => <div data-testid="join-form">join</div>,
}));

vi.mock('./TeamDashboard', () => ({
  TeamDashboard: ({ onTeamCleared }: { onTeamCleared: () => void }) => (
    <button onClick={onTeamCleared}>clear-team-stub</button>
  ),
}));

import { TeamPage } from './TeamPage';

afterEach(() => {
  useCurrentTeamMock.mockReset();
});

describe('TeamPage', () => {
  it('team이 없으면 CreateTeamForm과 JoinTeamForm을 렌더링하고 TeamDashboard는 렌더링하지 않는다', () => {
    useCurrentTeamMock.mockReturnValue({ team: null, setTeam: vi.fn(), clearTeam: vi.fn() });

    render(<TeamPage />);

    expect(screen.getByText('create-team-stub')).toBeInTheDocument();
    expect(screen.getByTestId('join-form')).toBeInTheDocument();
    expect(screen.queryByText('clear-team-stub')).not.toBeInTheDocument();
  });

  it('CreateTeamForm에서 팀이 생성되면 setTeam이 호출된다', async () => {
    const user = userEvent.setup();
    const setTeam = vi.fn();
    useCurrentTeamMock.mockReturnValue({ team: null, setTeam, clearTeam: vi.fn() });

    render(<TeamPage />);
    await user.click(screen.getByText('create-team-stub'));

    expect(setTeam).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', name: '프론트팀' }));
  });

  it('team이 있으면 TeamDashboard를 렌더링하고 CreateTeamForm/JoinTeamForm은 렌더링하지 않는다', () => {
    useCurrentTeamMock.mockReturnValue({
      team: { id: 't1', name: '프론트팀' },
      setTeam: vi.fn(),
      clearTeam: vi.fn(),
    });

    render(<TeamPage />);

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

    render(<TeamPage />);
    await user.click(screen.getByText('clear-team-stub'));

    expect(clearTeam).toHaveBeenCalledTimes(1);
  });
});

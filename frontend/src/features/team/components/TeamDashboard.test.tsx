import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../shared/api/api-error';
import type { TeamMember } from '../../../shared/types/team.types';

const useAuthMock = vi.fn();
const useTeamMembersMock = vi.fn();
const delegateLeaderMock = vi.fn();

vi.mock('../../auth/hooks/use-auth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../hooks/use-team-members', () => ({
  useTeamMembers: (...args: unknown[]) => useTeamMembersMock(...args),
}));

vi.mock('../api/team.api', () => ({
  delegateLeader: (...args: unknown[]) => delegateLeaderMock(...args),
}));

vi.mock('./InviteMemberForm', () => ({
  InviteMemberForm: ({ teamId }: { teamId: string }) => <div data-testid="invite-form">invite:{teamId}</div>,
}));

vi.mock('./TeamIdCopyButton', () => ({
  TeamIdCopyButton: ({ teamId }: { teamId: string }) => <div data-testid="team-id-copy">copy:{teamId}</div>,
}));

vi.mock('./PendingJoinRequestsPanel', () => ({
  PendingJoinRequestsPanel: () => <div data-testid="pending-panel">pending</div>,
}));

vi.mock('./MemberList', () => ({
  MemberList: ({ onDelegate }: { onDelegate: (userId: string) => void }) => (
    <div data-testid="member-list">
      <button onClick={() => onDelegate('u2')}>delegate</button>
    </div>
  ),
}));

vi.mock('./LeaveTeamButton', () => ({
  LeaveTeamButton: () => <div data-testid="leave-button">leave</div>,
}));

import { TeamDashboard } from './TeamDashboard';

const leaderMember: TeamMember = {
  userId: 'u1',
  email: 'leader@test.com',
  name: '리더',
  role: 'LEADER',
  joinedAt: '2026-01-01T00:00:00.000Z',
};
const memberMember: TeamMember = {
  userId: 'u2',
  email: 'member@test.com',
  name: '멤버',
  role: 'MEMBER',
  joinedAt: '2026-01-02T00:00:00.000Z',
};

afterEach(() => {
  useAuthMock.mockReset();
  useTeamMembersMock.mockReset();
  delegateLeaderMock.mockReset();
});

describe('TeamDashboard', () => {
  it('로그인 사용자의 role이 LEADER로 파생되면 InviteMemberForm과 PendingJoinRequestsPanel을 렌더링한다', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    useTeamMembersMock.mockReturnValue({
      members: [leaderMember, memberMember],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<TeamDashboard team={{ id: 't1', name: '프론트팀' }} onTeamCleared={vi.fn()} />);

    expect(screen.getByTestId('invite-form')).toBeInTheDocument();
    expect(screen.getByTestId('team-id-copy')).toBeInTheDocument();
    expect(screen.getByTestId('pending-panel')).toBeInTheDocument();
    expect(screen.getByTestId('member-list')).toBeInTheDocument();
    expect(screen.getByTestId('leave-button')).toBeInTheDocument();
  });

  it('로그인 사용자의 role이 MEMBER로 파생되면 InviteMemberForm과 PendingJoinRequestsPanel을 렌더링하지 않는다', () => {
    useAuthMock.mockReturnValue({ user: { id: 'u2' } });
    useTeamMembersMock.mockReturnValue({
      members: [leaderMember, memberMember],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<TeamDashboard team={{ id: 't1', name: '프론트팀' }} onTeamCleared={vi.fn()} />);

    expect(screen.queryByTestId('invite-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('team-id-copy')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pending-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('member-list')).toBeInTheDocument();
  });

  it('members 조회가 403/404로 실패하면 안내와 팀 나가기 버튼을 표시하고 클릭 시 onTeamCleared를 호출한다', async () => {
    const user = userEvent.setup();
    const onTeamCleared = vi.fn();
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    useTeamMembersMock.mockReturnValue({
      members: [],
      isLoading: false,
      error: new ApiError(403, 'NOT_MEMBER', '팀 멤버가 아닙니다'),
      refresh: vi.fn(),
    });

    render(<TeamDashboard team={{ id: 't1', name: '프론트팀' }} onTeamCleared={onTeamCleared} />);

    const leaveButton = screen.getByRole('button', { name: /팀 나가기/ });
    await user.click(leaveButton);

    expect(onTeamCleared).toHaveBeenCalledTimes(1);
  });

  it('MemberList의 onDelegate 호출 시 delegateLeader를 팀 id와 대상 userId로 호출한다', async () => {
    const user = userEvent.setup();
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    useTeamMembersMock.mockReturnValue({
      members: [leaderMember, memberMember],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    delegateLeaderMock.mockResolvedValue([]);

    render(<TeamDashboard team={{ id: 't1', name: '프론트팀' }} onTeamCleared={vi.fn()} />);
    await user.click(screen.getByText('delegate'));

    await waitFor(() => {
      expect(delegateLeaderMock).toHaveBeenCalledWith('t1', { newLeaderUserId: 'u2' });
    });
  });
});

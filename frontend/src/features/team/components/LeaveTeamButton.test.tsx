import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../shared/api/api-error';
import type { LeaveTeamResponse } from '../../../shared/types/team.types';

const leaveTeamMock = vi.fn();

vi.mock('../api/team.api', () => ({
  leaveTeam: (...args: unknown[]) => leaveTeamMock(...args),
}));

import { LeaveTeamButton } from './LeaveTeamButton';

afterEach(() => {
  leaveTeamMock.mockReset();
});

describe('LeaveTeamButton', () => {
  it('버튼 클릭 시 leaveTeam이 teamId와 함께 호출된다', async () => {
    const user = userEvent.setup();
    leaveTeamMock.mockResolvedValue({ teamId: 't1', teamDissolved: false } as LeaveTeamResponse);
    render(<LeaveTeamButton teamId="t1" isLeader={false} memberCount={2} onLeft={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /나가기|탈퇴/ }));

    await waitFor(() => {
      expect(leaveTeamMock).toHaveBeenCalledWith('t1');
    });
  });

  it('teamDissolved가 true이면 팀 해체 문구를 표시하고 onLeft를 호출한다', async () => {
    const user = userEvent.setup();
    const onLeft = vi.fn();
    const response: LeaveTeamResponse = { teamId: 't1', teamDissolved: true };
    leaveTeamMock.mockResolvedValue(response);
    render(<LeaveTeamButton teamId="t1" isLeader memberCount={1} onLeft={onLeft} />);

    await user.click(screen.getByRole('button', { name: /나가기|탈퇴/ }));

    expect(await screen.findByText(/팀이 해체되었습니다/)).toBeInTheDocument();
    expect(onLeft).toHaveBeenCalledWith(response);
  });

  it('teamDissolved가 false이면 팀 탈퇴 문구를 표시하고 onLeft를 호출한다', async () => {
    const user = userEvent.setup();
    const onLeft = vi.fn();
    const response: LeaveTeamResponse = { teamId: 't1', teamDissolved: false };
    leaveTeamMock.mockResolvedValue(response);
    render(<LeaveTeamButton teamId="t1" isLeader={false} memberCount={3} onLeft={onLeft} />);

    await user.click(screen.getByRole('button', { name: /나가기|탈퇴/ }));

    expect(await screen.findByText(/팀에서 탈퇴했습니다/)).toBeInTheDocument();
    expect(onLeft).toHaveBeenCalledWith(response);
  });

  it('409 실패 시 팀장 위임 안내를 인라인으로 표시하고 onLeft는 호출되지 않는다', async () => {
    const user = userEvent.setup();
    const onLeft = vi.fn();
    leaveTeamMock.mockRejectedValue(new ApiError(409, 'LEADER_MUST_DELEGATE', '위임이 필요합니다'));
    render(<LeaveTeamButton teamId="t1" isLeader memberCount={2} onLeft={onLeft} />);

    await user.click(screen.getByRole('button', { name: /나가기|탈퇴/ }));

    expect(await screen.findByText(/탈퇴하려면 먼저 팀장을 위임해야 합니다/)).toBeInTheDocument();
    expect(onLeft).not.toHaveBeenCalled();
  });
});

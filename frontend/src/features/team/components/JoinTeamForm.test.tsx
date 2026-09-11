import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../shared/api/api-error';
import type { TeamJoinRequest } from '../../../shared/types/team.types';

const joinTeamMock = vi.fn();

vi.mock('../api/team.api', () => ({
  joinTeam: (...args: unknown[]) => joinTeamMock(...args),
}));

import { JoinTeamForm } from './JoinTeamForm';

afterEach(() => {
  joinTeamMock.mockReset();
});

const joinRequest: TeamJoinRequest = {
  id: 'jr1',
  teamId: 't1',
  requesterUserId: 'u1',
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00.000Z',
  decidedAt: null,
};

describe('JoinTeamForm', () => {
  it('팀 ID를 입력하고 제출하면 joinTeam이 올바른 인자로 호출된다', async () => {
    const user = userEvent.setup();
    joinTeamMock.mockResolvedValue(joinRequest);
    render(<JoinTeamForm />);

    await user.type(screen.getByLabelText(/팀 ID/), 't1');
    await user.click(screen.getByRole('button', { name: /가입/ }));

    await waitFor(() => {
      expect(joinTeamMock).toHaveBeenCalledWith('t1');
    });
  });

  it('202 성공 시 대기 안내 문구를 표시한다', async () => {
    const user = userEvent.setup();
    joinTeamMock.mockResolvedValue(joinRequest);
    render(<JoinTeamForm />);

    await user.type(screen.getByLabelText(/팀 ID/), 't1');
    await user.click(screen.getByRole('button', { name: /가입/ }));

    expect(await screen.findByText(/가입 요청을 보냈습니다/)).toBeInTheDocument();
  });

  it('409(이미 소속/대기중)에도 동일한 대기 안내 문구를 표시한다', async () => {
    const user = userEvent.setup();
    joinTeamMock.mockRejectedValue(new ApiError(409, 'JOIN_REQUEST_ALREADY_EXISTS', '이미 요청이 존재합니다'));
    render(<JoinTeamForm />);

    await user.type(screen.getByLabelText(/팀 ID/), 't1');
    await user.click(screen.getByRole('button', { name: /가입/ }));

    expect(await screen.findByText(/가입 요청을 보냈습니다/)).toBeInTheDocument();
  });

  it('404 실패 시 존재하지 않는 팀 ID 안내를 표시한다', async () => {
    const user = userEvent.setup();
    joinTeamMock.mockRejectedValue(new ApiError(404, 'TEAM_NOT_FOUND', '팀을 찾을 수 없습니다'));
    render(<JoinTeamForm />);

    await user.type(screen.getByLabelText(/팀 ID/), 'unknown');
    await user.click(screen.getByRole('button', { name: /가입/ }));

    expect(await screen.findByText('존재하지 않는 팀 ID입니다')).toBeInTheDocument();
  });
});

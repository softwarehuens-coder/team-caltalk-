import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../shared/api/api-error';
import type { Team, TeamJoinRequest } from '../../../shared/types/team.types';

const joinTeamMock = vi.fn();
const getTeamMock = vi.fn();

vi.mock('../api/team.api', () => ({
  joinTeam: (...args: unknown[]) => joinTeamMock(...args),
  getTeam: (...args: unknown[]) => getTeamMock(...args),
}));

import { JoinTeamForm } from './JoinTeamForm';

afterEach(() => {
  joinTeamMock.mockReset();
  getTeamMock.mockReset();
  vi.useRealTimers();
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

  it('409(ALREADY_MEMBER)이면 getTeam으로 팀 이름을 조회해 onJoined를 호출한다 (승인 후 팀 진입 불가 버그 회귀 테스트)', async () => {
    const user = userEvent.setup();
    const team: Team = { id: 't1', name: 'E2E검증팀', createdAt: '2026-01-01T00:00:00.000Z' };
    joinTeamMock.mockRejectedValue(new ApiError(409, 'ALREADY_MEMBER', '이미 해당 팀에 소속되어 있습니다.'));
    getTeamMock.mockResolvedValue(team);
    const onJoined = vi.fn();
    render(<JoinTeamForm onJoined={onJoined} />);

    await user.type(screen.getByLabelText(/팀 ID/), 't1');
    await user.click(screen.getByRole('button', { name: /가입/ }));

    await waitFor(() => {
      expect(getTeamMock).toHaveBeenCalledWith('t1');
    });
    await waitFor(() => {
      expect(onJoined).toHaveBeenCalledWith(team);
    });
  });

  it('409(ALREADY_MEMBER)인데 getTeam도 실패하면 오류 안내를 표시한다', async () => {
    const user = userEvent.setup();
    joinTeamMock.mockRejectedValue(new ApiError(409, 'ALREADY_MEMBER', '이미 해당 팀에 소속되어 있습니다.'));
    getTeamMock.mockRejectedValue(new ApiError(500, 'UNKNOWN_ERROR', '서버 오류'));
    const onJoined = vi.fn();
    render(<JoinTeamForm onJoined={onJoined} />);

    await user.type(screen.getByLabelText(/팀 ID/), 't1');
    await user.click(screen.getByRole('button', { name: /가입/ }));

    expect(await screen.findByText(/정보를 불러오지 못했습니다/)).toBeInTheDocument();
    expect(onJoined).not.toHaveBeenCalled();
  });

  it('가입 요청이 대기 중인 동안 승인 여부를 주기적으로 재확인하고, 승인되면 자동으로 onJoined를 호출한다 (팀원이 승인 후 캘린더로 못 넘어가던 버그 회귀 테스트)', async () => {
    vi.useFakeTimers();
    const team: Team = { id: 't1', name: 'E2E검증팀', createdAt: '2026-01-01T00:00:00.000Z' };
    const onJoined = vi.fn();

    joinTeamMock.mockResolvedValueOnce(joinRequest); // 최초 제출: 202 대기 상태
    render(<JoinTeamForm onJoined={onJoined} />);

    fireEvent.change(screen.getByLabelText(/팀 ID/), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('button', { name: /가입/ }));
    await vi.advanceTimersByTimeAsync(0);

    expect(screen.getByText(/가입 요청을 보냈습니다/)).toBeInTheDocument();
    expect(onJoined).not.toHaveBeenCalled();

    // 아직 대기 중이면(JOIN_REQUEST_ALREADY_PENDING) 계속 대기한다.
    joinTeamMock.mockRejectedValueOnce(
      new ApiError(409, 'JOIN_REQUEST_ALREADY_PENDING', '이미 처리 대기 중인 가입 요청이 있습니다.'),
    );
    await vi.advanceTimersByTimeAsync(3000);
    expect(onJoined).not.toHaveBeenCalled();

    // 팀장이 승인하면 다음 재확인에서 ALREADY_MEMBER로 전환되고, 자동으로 onJoined가 호출된다.
    joinTeamMock.mockRejectedValueOnce(new ApiError(409, 'ALREADY_MEMBER', '이미 해당 팀에 소속되어 있습니다.'));
    getTeamMock.mockResolvedValueOnce(team);
    await vi.advanceTimersByTimeAsync(3000);

    expect(getTeamMock).toHaveBeenCalledWith('t1');
    expect(onJoined).toHaveBeenCalledWith(team);
  });
});

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../shared/api/api-error';
import type { TeamJoinRequest } from '../../../shared/types/team.types';

const useJoinRequestsMock = vi.fn();

vi.mock('../hooks/use-join-requests', () => ({
  useJoinRequests: (...args: unknown[]) => useJoinRequestsMock(...args),
}));

import { PendingJoinRequestsPanel } from './PendingJoinRequestsPanel';

afterEach(() => {
  useJoinRequestsMock.mockReset();
});

const pendingRequest: TeamJoinRequest = {
  id: 'jr1',
  teamId: 't1',
  requesterUserId: 'u2',
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00.000Z',
  decidedAt: null,
};

describe('PendingJoinRequestsPanel', () => {
  it('useJoinRequests(teamId, true)를 사용하여 PENDING 목록을 렌더링한다', () => {
    useJoinRequestsMock.mockReturnValue({
      requests: [pendingRequest],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      approve: vi.fn(),
    });

    render(<PendingJoinRequestsPanel teamId="t1" onApproved={vi.fn()} />);

    expect(useJoinRequestsMock).toHaveBeenCalledWith('t1', true);
    expect(screen.getByText(pendingRequest.requesterUserId)).toBeInTheDocument();
  });

  it('승인 버튼 클릭 시 approve가 요청 id와 함께 호출되고, 성공 시 목록에서 제거되며 onApproved가 호출된다', async () => {
    const user = userEvent.setup();
    const onApproved = vi.fn();
    let requests = [pendingRequest];
    const approve = vi.fn().mockImplementation(async (requestId: string) => {
      requests = requests.filter((r) => r.id !== requestId);
      return { id: 'm1', teamId: 't1', userId: 'u2', role: 'MEMBER', createdAt: '2026-01-01T00:00:00.000Z' };
    });
    useJoinRequestsMock.mockImplementation(() => ({
      requests,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      approve,
    }));

    render(<PendingJoinRequestsPanel teamId="t1" onApproved={onApproved} />);
    await user.click(screen.getByRole('button', { name: /승인/ }));

    expect(approve).toHaveBeenCalledWith('jr1');
    await waitFor(() => {
      expect(onApproved).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.queryByText(pendingRequest.requesterUserId)).not.toBeInTheDocument();
    });
  });

  it('승인이 409(JOIN_REQUEST_NOT_PENDING)로 실패하면 이미 처리된 요청 안내를 표시한다', async () => {
    const user = userEvent.setup();
    const onApproved = vi.fn();
    const error = new ApiError(409, 'JOIN_REQUEST_NOT_PENDING', '이미 처리되었습니다');
    useJoinRequestsMock.mockReturnValue({
      requests: [pendingRequest],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      approve: vi.fn().mockRejectedValue(error),
    });

    render(<PendingJoinRequestsPanel teamId="t1" onApproved={onApproved} />);
    await user.click(screen.getByRole('button', { name: /승인/ }));

    expect(await screen.findByText('이미 처리된 요청입니다')).toBeInTheDocument();
    expect(onApproved).not.toHaveBeenCalled();
  });
});

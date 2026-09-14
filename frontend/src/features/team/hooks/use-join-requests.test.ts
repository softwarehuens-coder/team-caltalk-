import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '../../../shared/api/api-error';
import type { TeamJoinRequest, TeamMembership } from '../../../shared/types/team.types';

const listJoinRequestsMock = vi.fn();
const approveJoinRequestMock = vi.fn();

vi.mock('../api/team.api', () => ({
  listJoinRequests: (...args: unknown[]) => listJoinRequestsMock(...args),
  approveJoinRequest: (...args: unknown[]) => approveJoinRequestMock(...args),
}));

import { useJoinRequests } from './use-join-requests';

afterEach(() => {
  listJoinRequestsMock.mockReset();
  approveJoinRequestMock.mockReset();
});

const pendingRequest: TeamJoinRequest = {
  id: 'jr1',
  teamId: 't1',
  requesterUserId: 'u2',
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00.000Z',
  decidedAt: null,
};

describe('useJoinRequests', () => {
  it('enabled가 false이면 listJoinRequests를 호출하지 않는다', () => {
    renderHook(() => useJoinRequests('t1', false));

    expect(listJoinRequestsMock).not.toHaveBeenCalled();
  });

  it('enabled가 true이면 마운트 시 목록을 조회해 requests에 반영한다', async () => {
    listJoinRequestsMock.mockResolvedValue([pendingRequest]);

    const { result } = renderHook(() => useJoinRequests('t1', true));

    await waitFor(() => {
      expect(result.current.requests).toEqual([pendingRequest]);
    });
    expect(listJoinRequestsMock).toHaveBeenCalledWith('t1');
  });

  it('approve 성공 시 approveJoinRequest를 호출하고 내부적으로 목록을 재조회한다', async () => {
    listJoinRequestsMock.mockResolvedValueOnce([pendingRequest]).mockResolvedValueOnce([]);
    const membership: TeamMembership = {
      id: 'm1',
      teamId: 't1',
      userId: 'u2',
      role: 'MEMBER',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    approveJoinRequestMock.mockResolvedValue(membership);

    const { result } = renderHook(() => useJoinRequests('t1', true));

    await waitFor(() => {
      expect(result.current.requests).toEqual([pendingRequest]);
    });

    const returned = await result.current.approve('jr1');

    expect(approveJoinRequestMock).toHaveBeenCalledWith('jr1');
    expect(returned).toEqual(membership);
    await waitFor(() => {
      expect(listJoinRequestsMock).toHaveBeenCalledTimes(2);
    });
    expect(result.current.requests).toEqual([]);
  });

  it('approve가 409로 실패하면 에러가 그대로 전파되고 재조회하지 않는다', async () => {
    listJoinRequestsMock.mockResolvedValue([pendingRequest]);
    const error = new ApiError(409, 'JOIN_REQUEST_NOT_PENDING', '이미 처리된 요청입니다');
    approveJoinRequestMock.mockRejectedValue(error);

    const { result } = renderHook(() => useJoinRequests('t1', true));

    await waitFor(() => {
      expect(result.current.requests).toEqual([pendingRequest]);
    });

    await expect(result.current.approve('jr1')).rejects.toBe(error);
    expect(listJoinRequestsMock).toHaveBeenCalledTimes(1);
  });
});

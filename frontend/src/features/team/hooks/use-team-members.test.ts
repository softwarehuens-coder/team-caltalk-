import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '../../../shared/api/api-error';
import type { TeamMember } from '../../../shared/types/team.types';

const getTeamMembersMock = vi.fn();

vi.mock('../api/team.api', () => ({
  getTeamMembers: (...args: unknown[]) => getTeamMembersMock(...args),
}));

import { useTeamMembers } from './use-team-members';

afterEach(() => {
  getTeamMembersMock.mockReset();
});

describe('useTeamMembers', () => {
  it('마운트 시 getTeamMembers를 호출하고 성공하면 members를 채운다', async () => {
    const members: TeamMember[] = [
      { userId: 'u1', email: 'leader@test.com', name: '리더', role: 'LEADER', joinedAt: '2026-01-01T00:00:00.000Z' },
    ];
    getTeamMembersMock.mockResolvedValue(members);

    const { result } = renderHook(() => useTeamMembers('t1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(getTeamMembersMock).toHaveBeenCalledWith('t1');
    expect(result.current.members).toEqual(members);
    expect(result.current.error).toBeNull();
  });

  it('조회가 403으로 실패하면 error에 ApiError를 저장한다', async () => {
    const error = new ApiError(403, 'NOT_MEMBER', '팀 멤버가 아닙니다');
    getTeamMembersMock.mockRejectedValue(error);

    const { result } = renderHook(() => useTeamMembers('t1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBe(error);
    expect(result.current.members).toEqual([]);
  });

  it('조회가 404로 실패하면 error에 ApiError를 저장한다', async () => {
    const error = new ApiError(404, 'TEAM_NOT_FOUND', '존재하지 않는 팀입니다');
    getTeamMembersMock.mockRejectedValue(error);

    const { result } = renderHook(() => useTeamMembers('t1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBe(error);
  });

  it('refresh 호출 시 getTeamMembers를 다시 호출하고 최신 결과로 갱신한다', async () => {
    const initial: TeamMember[] = [
      { userId: 'u1', email: 'leader@test.com', name: '리더', role: 'LEADER', joinedAt: '2026-01-01T00:00:00.000Z' },
    ];
    const updated: TeamMember[] = [
      ...initial,
      { userId: 'u2', email: 'member@test.com', name: '멤버', role: 'MEMBER', joinedAt: '2026-01-02T00:00:00.000Z' },
    ];
    getTeamMembersMock.mockResolvedValueOnce(initial).mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useTeamMembers('t1'));

    await waitFor(() => {
      expect(result.current.members).toEqual(initial);
    });

    await result.current.refresh();

    await waitFor(() => {
      expect(result.current.members).toEqual(updated);
    });
    expect(getTeamMembersMock).toHaveBeenCalledTimes(2);
  });
});

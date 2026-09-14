import { describe, it, expect, vi } from 'vitest';
import { leaveTeam } from '../../../../src/application/team/leave-team.usecase';
import { NotFoundError, ConflictError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from './fake-team-repository';

const TEAM = { id: 'team-1', name: '디자인팀', createdAt: '2026-09-09T00:00:00.000Z' };
const membership = (role: 'LEADER' | 'MEMBER') => ({
  id: 'm1',
  teamId: 'team-1',
  userId: 'u1',
  role,
  createdAt: '2026-09-09T00:00:00.000Z',
});

describe('leaveTeam', () => {
  it('팀이 없으면 NotFoundError', async () => {
    const repo = fakeTeamRepository({ findById: vi.fn().mockResolvedValue(null) });
    await expect(leaveTeam(repo, { teamId: 'nope', userId: 'u1' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('해당 팀 구성원이 아니면 NotFoundError', async () => {
    const repo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(null),
    });
    await expect(leaveTeam(repo, { teamId: 'team-1', userId: 'u1' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('MEMBER 탈퇴는 멤버십만 제거하고 teamDissolved=false', async () => {
    const repo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(membership('MEMBER')),
      countMembers: vi.fn().mockResolvedValue(3),
    });

    const result = await leaveTeam(repo, { teamId: 'team-1', userId: 'u1' });

    expect(result).toEqual({ teamId: 'team-1', teamDissolved: false });
    expect(repo.removeMember).toHaveBeenCalledWith('team-1', 'u1');
    expect(repo.deleteTeam).not.toHaveBeenCalled();
  });

  it('위임 없는 유일 팀장이 아닌 LEADER 탈퇴 시도는 ConflictError(409)', async () => {
    const repo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(membership('LEADER')),
      countMembers: vi.fn().mockResolvedValue(3),
    });

    await expect(leaveTeam(repo, { teamId: 'team-1', userId: 'u1' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(repo.removeMember).not.toHaveBeenCalled();
    expect(repo.deleteTeam).not.toHaveBeenCalled();
  });

  it('유일한 구성원인 LEADER 탈퇴는 팀을 해체(deleteTeam)하고 teamDissolved=true', async () => {
    const repo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(membership('LEADER')),
      countMembers: vi.fn().mockResolvedValue(1),
    });

    const result = await leaveTeam(repo, { teamId: 'team-1', userId: 'u1' });

    expect(result).toEqual({ teamId: 'team-1', teamDissolved: true });
    expect(repo.deleteTeam).toHaveBeenCalledWith('team-1');
    expect(repo.removeMember).not.toHaveBeenCalled();
  });
});

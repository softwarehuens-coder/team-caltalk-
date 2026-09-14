import { describe, it, expect, vi } from 'vitest';
import { delegateLeader } from '../../../../src/application/team/delegate-leader.usecase';
import { ForbiddenError, ConflictError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from './fake-team-repository';

const membership = (userId: string, role: 'LEADER' | 'MEMBER') => ({
  id: `m-${userId}`,
  teamId: 'team-1',
  userId,
  role,
  createdAt: '2026-09-09T00:00:00.000Z',
});

describe('delegateLeader', () => {
  it('actor가 LEADER가 아니면 ForbiddenError', async () => {
    const repo = fakeTeamRepository({
      findMembership: vi.fn().mockResolvedValue(membership('u1', 'MEMBER')),
    });

    await expect(
      delegateLeader(repo, { teamId: 'team-1', actorUserId: 'u1', newLeaderUserId: 'u2' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('위임 대상이 해당 팀 MEMBER가 아니면 ConflictError', async () => {
    const repo = fakeTeamRepository({
      findMembership: vi
        .fn()
        .mockResolvedValueOnce(membership('u1', 'LEADER'))
        .mockResolvedValueOnce(null),
    });

    await expect(
      delegateLeader(repo, { teamId: 'team-1', actorUserId: 'u1', newLeaderUserId: 'u2' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('정상 위임 시 transferLeadership을 호출하고 갱신된 목록을 반환한다', async () => {
    const updated = [membership('u1', 'MEMBER'), membership('u2', 'LEADER')];
    const repo = fakeTeamRepository({
      findMembership: vi
        .fn()
        .mockResolvedValueOnce(membership('u1', 'LEADER'))
        .mockResolvedValueOnce(membership('u2', 'MEMBER')),
      transferLeadership: vi.fn().mockResolvedValue(updated),
    });

    const result = await delegateLeader(repo, {
      teamId: 'team-1',
      actorUserId: 'u1',
      newLeaderUserId: 'u2',
    });

    expect(result).toEqual(updated);
    expect(repo.transferLeadership).toHaveBeenCalledWith('team-1', 'u1', 'u2');
  });
});

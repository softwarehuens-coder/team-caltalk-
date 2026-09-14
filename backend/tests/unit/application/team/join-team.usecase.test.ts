import { describe, it, expect, vi } from 'vitest';
import { joinTeam } from '../../../../src/application/team/join-team.usecase';
import { NotFoundError, ConflictError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from './fake-team-repository';

const TEAM = { id: 'team-1', name: '디자인팀', createdAt: '2026-09-09T00:00:00.000Z' };

describe('joinTeam', () => {
  it('팀이 없으면 NotFoundError', async () => {
    const repo = fakeTeamRepository({ findById: vi.fn().mockResolvedValue(null) });

    await expect(joinTeam(repo, { teamId: 'nope', userId: 'u1' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('이미 소속되어 있으면 ConflictError', async () => {
    const repo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'MEMBER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });

    await expect(joinTeam(repo, { teamId: 'team-1', userId: 'u1' })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('신규 사용자는 PENDING 가입 요청을 만들며 MEMBER로 등록되지 않는다', async () => {
    const repo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(null),
      createJoinRequest: vi.fn().mockResolvedValue({
        id: 'r1',
        teamId: 'team-1',
        requesterUserId: 'u2',
        status: 'PENDING',
        createdAt: '2026-09-09T00:00:00.000Z',
        decidedAt: null,
      }),
    });

    const joinRequest = await joinTeam(repo, { teamId: 'team-1', userId: 'u2' });

    expect(joinRequest.status).toBe('PENDING');
    expect(repo.createJoinRequest).toHaveBeenCalledWith('team-1', 'u2');
    expect(repo.addMember).not.toHaveBeenCalled();
  });
});

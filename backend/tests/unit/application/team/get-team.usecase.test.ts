import { describe, it, expect, vi } from 'vitest';
import { getTeam } from '../../../../src/application/team/get-team.usecase';
import { NotFoundError, ForbiddenError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from './fake-team-repository';

const TEAM = { id: 'team-1', name: '디자인팀', createdAt: '2026-09-09T00:00:00.000Z' };

describe('getTeam', () => {
  it('팀이 없으면 NotFoundError', async () => {
    const repo = fakeTeamRepository({ findById: vi.fn().mockResolvedValue(null) });
    await expect(getTeam(repo, { teamId: 'nope', actorUserId: 'u1' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('actor가 팀 구성원이 아니면 ForbiddenError', async () => {
    const repo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(null),
    });
    await expect(getTeam(repo, { teamId: 'team-1', actorUserId: 'u1' })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('팀 구성원이면 팀 정보를 반환한다 — 가입 승인 후 팀 이름을 알 방법이 없던 FE-2 갭 해결', async () => {
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

    const result = await getTeam(repo, { teamId: 'team-1', actorUserId: 'u1' });
    expect(result).toEqual(TEAM);
  });
});

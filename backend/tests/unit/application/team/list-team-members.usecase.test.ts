import { describe, it, expect, vi } from 'vitest';
import { listTeamMembers } from '../../../../src/application/team/list-team-members.usecase';
import { NotFoundError, ForbiddenError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from './fake-team-repository';

const TEAM = { id: 'team-1', name: '디자인팀', createdAt: '2026-09-09T00:00:00.000Z' };

describe('listTeamMembers', () => {
  it('팀이 없으면 NotFoundError', async () => {
    const repo = fakeTeamRepository({ findById: vi.fn().mockResolvedValue(null) });
    await expect(
      listTeamMembers(repo, { teamId: 'nope', actorUserId: 'u1' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('actor가 팀 구성원이 아니면 ForbiddenError', async () => {
    const repo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(null),
    });
    await expect(
      listTeamMembers(repo, { teamId: 'team-1', actorUserId: 'u1' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('팀 구성원이면 구성원 목록을 반환한다', async () => {
    const members = [
      {
        userId: 'u1',
        email: 'a@x.com',
        name: 'A',
        role: 'LEADER',
        joinedAt: '2026-09-09T00:00:00.000Z',
      },
    ];
    const repo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'LEADER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
      listMembers: vi.fn().mockResolvedValue(members),
    });

    const result = await listTeamMembers(repo, { teamId: 'team-1', actorUserId: 'u1' });
    expect(result).toEqual(members);
  });
});

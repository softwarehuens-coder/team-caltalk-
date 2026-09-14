import { describe, it, expect, vi } from 'vitest';
import { inviteTeamMember } from '../../../../src/application/team/invite-team-member.usecase';
import { NotFoundError, ForbiddenError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from './fake-team-repository';

const TEAM = { id: 'team-1', name: '디자인팀', createdAt: '2026-09-09T00:00:00.000Z' };

describe('inviteTeamMember', () => {
  it('팀이 없으면 NotFoundError', async () => {
    const repo = fakeTeamRepository({ findById: vi.fn().mockResolvedValue(null) });

    await expect(
      inviteTeamMember(repo, { teamId: 'nope', actorUserId: 'u1', invitedEmail: 'a@x.com' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('actor가 MEMBER면 ForbiddenError', async () => {
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

    await expect(
      inviteTeamMember(repo, { teamId: 'team-1', actorUserId: 'u1', invitedEmail: 'a@x.com' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('actor가 LEADER면 초대 확인 응답을 반환한다', async () => {
    const repo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'LEADER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });

    const result = await inviteTeamMember(repo, {
      teamId: 'team-1',
      actorUserId: 'u1',
      invitedEmail: 'a@x.com',
    });

    expect(result.teamId).toBe('team-1');
    expect(result.invitedEmail).toBe('a@x.com');
    expect(typeof result.invitedAt).toBe('string');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { listPendingJoinRequests } from '../../../../src/application/team/list-pending-join-requests.usecase';
import { ForbiddenError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from './fake-team-repository';

const TEAM = { id: 'team-1', name: '디자인팀', createdAt: '2026-09-10T00:00:00.000Z' };

describe('listPendingJoinRequests', () => {
  it('팀장만 대기 중 가입 요청을 조회할 수 있다', async () => {
    const requests = [{ id: 'r1', teamId: TEAM.id, requesterUserId: 'u2', status: 'PENDING' as const, createdAt: TEAM.createdAt, decidedAt: null }];
    const repo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue({ role: 'LEADER' }),
      listPendingJoinRequests: vi.fn().mockResolvedValue(requests),
    });
    await expect(listPendingJoinRequests(repo, { teamId: TEAM.id, actorUserId: 'leader' }))
      .resolves.toEqual(requests);
  });

  it('팀원이 조회하면 ForbiddenError', async () => {
    const repo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue({ role: 'MEMBER' }),
    });
    await expect(listPendingJoinRequests(repo, { teamId: TEAM.id, actorUserId: 'member' }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });
});

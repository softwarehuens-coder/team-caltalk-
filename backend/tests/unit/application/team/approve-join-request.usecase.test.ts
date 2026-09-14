import { describe, it, expect, vi } from 'vitest';
import { approveJoinRequest } from '../../../../src/application/team/approve-join-request.usecase';
import { ForbiddenError, NotFoundError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from './fake-team-repository';

const REQUEST = {
  id: 'request-1', teamId: 'team-1', requesterUserId: 'user-2', status: 'PENDING' as const,
  createdAt: '2026-09-10T00:00:00.000Z', decidedAt: null,
};

describe('approveJoinRequest', () => {
  it('요청이 없으면 NotFoundError', async () => {
    const repo = fakeTeamRepository({ findJoinRequest: vi.fn().mockResolvedValue(null) });
    await expect(approveJoinRequest(repo, { joinRequestId: 'missing', actorUserId: 'leader-1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('팀장이 아니면 승인할 수 없다', async () => {
    const repo = fakeTeamRepository({
      findJoinRequest: vi.fn().mockResolvedValue(REQUEST),
      findMembership: vi.fn().mockResolvedValue({ role: 'MEMBER' }),
    });
    await expect(approveJoinRequest(repo, { joinRequestId: REQUEST.id, actorUserId: 'user-3' }))
      .rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.approveJoinRequest).not.toHaveBeenCalled();
  });

  it('팀장이 승인하면 트랜잭션 기반 MEMBER 생성 결과를 반환한다', async () => {
    const membership = { id: 'membership-1', teamId: 'team-1', userId: 'user-2', role: 'MEMBER' as const, createdAt: '2026-09-10T00:00:01.000Z' };
    const repo = fakeTeamRepository({
      findJoinRequest: vi.fn().mockResolvedValue(REQUEST),
      findMembership: vi.fn().mockResolvedValue({ role: 'LEADER' }),
      approveJoinRequest: vi.fn().mockResolvedValue(membership),
    });
    await expect(approveJoinRequest(repo, { joinRequestId: REQUEST.id, actorUserId: 'leader-1' }))
      .resolves.toEqual(membership);
    expect(repo.approveJoinRequest).toHaveBeenCalledWith('team-1', REQUEST.id);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { rejectChangeRequest } from '../../../../src/application/change-request/reject-change-request.usecase';
import { ForbiddenError, ConflictError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from '../team/fake-team-repository';
import { fakeScheduleRepository } from '../schedule/fake-schedule-repository';
import { fakeChangeRequestRepository } from './fake-change-request-repository';
import { fakeChatRepository } from '../chat/fake-chat-repository';

const SCHEDULE = {
  id: 's1',
  teamId: 'team-1',
  title: '일정',
  startAt: '2026-09-09T00:00:00.000Z',
  endAt: '2026-09-09T01:00:00.000Z',
  createdAt: '2026-09-09T00:00:00.000Z',
  deletedAt: null,
  participants: [],
};
const PENDING_CR = {
  id: 'cr1',
  scheduleId: 's1',
  requestedByUserId: 'u1',
  status: 'PENDING' as const,
  desiredStartAt: '2026-09-10T00:00:00.000Z',
  desiredEndAt: '2026-09-10T01:00:00.000Z',
  reason: null,
  createdAt: '2026-09-09T00:00:00.000Z',
  decidedAt: null,
};
const INPUT = { changeRequestId: 'cr1', actorUserId: 'leader-1', reason: '일정이 곤란합니다' };

describe('rejectChangeRequest', () => {
  it('actor가 LEADER가 아니면 ForbiddenError이며 원본 schedules를 건드리지 않는다', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'leader-1',
        role: 'MEMBER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    const changeRequestRepo = fakeChangeRequestRepository({
      findById: vi.fn().mockResolvedValue(PENDING_CR),
    });

    await expect(
      rejectChangeRequest(teamRepo, scheduleRepo, changeRequestRepo, fakeChatRepository(), INPUT),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(changeRequestRepo.reject).not.toHaveBeenCalled();
    expect(scheduleRepo.update).not.toHaveBeenCalled();
  });

  it('이미 PENDING이 아니면 ConflictError(409) — 재거절 차단', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'leader-1',
        role: 'LEADER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    const changeRequestRepo = fakeChangeRequestRepository({
      findById: vi.fn().mockResolvedValue(PENDING_CR),
      reject: vi.fn().mockResolvedValue(null),
    });

    await expect(
      rejectChangeRequest(teamRepo, scheduleRepo, changeRequestRepo, fakeChatRepository(), INPUT),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('LEADER가 거절하면 status만 REJECTED로 바뀌고, 원본 schedules는 그대로이며, 채팅에 사유가 통지된다', async () => {
    const rejectedCr = {
      ...PENDING_CR,
      status: 'REJECTED' as const,
      decidedAt: '2026-09-09T01:00:00.000Z',
    };
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'leader-1',
        role: 'LEADER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    const changeRequestRepo = fakeChangeRequestRepository({
      findById: vi.fn().mockResolvedValue(PENDING_CR),
      reject: vi.fn().mockResolvedValue(rejectedCr),
    });
    const chatRepo = fakeChatRepository({
      findByScheduleId: vi
        .fn()
        .mockResolvedValue({ id: 'c1', scheduleId: 's1', createdAt: '2026-09-09T00:00:00.000Z' }),
      createMessage: vi.fn().mockResolvedValue({
        id: 'msg1',
        chatId: 'c1',
        senderUserId: 'leader-1',
        content: '통지',
        createdAt: '2026-09-09T01:00:00.000Z',
      }),
    });

    const result = await rejectChangeRequest(
      teamRepo,
      scheduleRepo,
      changeRequestRepo,
      chatRepo,
      INPUT,
    );

    expect(result.status).toBe('REJECTED');
    expect(scheduleRepo.update).not.toHaveBeenCalled();
    expect(chatRepo.createMessage).toHaveBeenCalledWith(
      'c1',
      'leader-1',
      expect.stringContaining('일정이 곤란합니다'),
    );
  });
});

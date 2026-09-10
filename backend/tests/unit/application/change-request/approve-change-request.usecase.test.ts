import { describe, it, expect, vi } from 'vitest';
import { approveChangeRequest } from '../../../../src/application/change-request/approve-change-request.usecase';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../../../src/domain/shared/http-errors';
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
const INPUT = { changeRequestId: 'cr1', actorUserId: 'leader-1' };

describe('approveChangeRequest', () => {
  it('변경 요청을 찾을 수 없으면 NotFoundError, approve()는 호출되지 않는다', async () => {
    const changeRequestRepo = fakeChangeRequestRepository({
      findById: vi.fn().mockResolvedValue(null),
    });

    await expect(
      approveChangeRequest(
        fakeTeamRepository(),
        fakeScheduleRepository(),
        changeRequestRepo,
        fakeChatRepository(),
        INPUT,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(changeRequestRepo.approve).not.toHaveBeenCalled();
  });

  it('actor가 LEADER가 아니면 ForbiddenError이며, 승인 전 원본은 건드리지 않는다(approve() 미호출)', async () => {
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
      approveChangeRequest(teamRepo, scheduleRepo, changeRequestRepo, fakeChatRepository(), INPUT),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(changeRequestRepo.approve).not.toHaveBeenCalled();
  });

  it('이미 PENDING이 아니면(리포지토리가 null 반환) ConflictError(409) — 재승인 차단', async () => {
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
      approve: vi.fn().mockResolvedValue(null),
    });

    await expect(
      approveChangeRequest(teamRepo, scheduleRepo, changeRequestRepo, fakeChatRepository(), INPUT),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('LEADER가 승인하면 원자적으로 갱신된 결과를 반환하고 채팅에 통지 메시지를 남긴다', async () => {
    const approvedCr = {
      ...PENDING_CR,
      status: 'APPROVED' as const,
      decidedAt: '2026-09-09T01:00:00.000Z',
    };
    const updatedSchedule = {
      ...SCHEDULE,
      startAt: PENDING_CR.desiredStartAt,
      endAt: PENDING_CR.desiredEndAt,
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
      approve: vi.fn().mockResolvedValue({ changeRequest: approvedCr, schedule: updatedSchedule }),
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

    const result = await approveChangeRequest(
      teamRepo,
      scheduleRepo,
      changeRequestRepo,
      chatRepo,
      INPUT,
    );

    expect(result).toEqual(approvedCr);
    expect(chatRepo.createMessage).toHaveBeenCalledWith('c1', 'leader-1', expect.any(String));
  });
});

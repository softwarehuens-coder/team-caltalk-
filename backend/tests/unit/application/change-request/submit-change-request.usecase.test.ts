import { describe, it, expect, vi } from 'vitest';
import { submitChangeRequest } from '../../../../src/application/change-request/submit-change-request.usecase';
import { NotFoundError, ForbiddenError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from '../team/fake-team-repository';
import { fakeScheduleRepository } from '../schedule/fake-schedule-repository';
import { fakeChangeRequestRepository } from './fake-change-request-repository';

const SCHEDULE = {
  id: 's1',
  teamId: 'team-1',
  title: '일정',
  startAt: '2026-09-09T00:00:00.000Z',
  endAt: '2026-09-09T01:00:00.000Z',
  createdAt: '2026-09-09T00:00:00.000Z',
  deletedAt: null,
  participants: [
    { id: 'p1', scheduleId: 's1', userId: 'u1', createdAt: '2026-09-09T00:00:00.000Z' },
  ],
};
const INPUT = {
  scheduleId: 's1',
  actorUserId: 'u1',
  desiredStartAt: '2026-09-10T00:00:00.000Z',
  desiredEndAt: '2026-09-10T01:00:00.000Z',
  reason: '사정이 생겼습니다',
};

describe('submitChangeRequest', () => {
  it('일정을 찾을 수 없으면 NotFoundError', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(null) });
    await expect(
      submitChangeRequest(scheduleRepo, fakeTeamRepository(), fakeChangeRequestRepository(), INPUT),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('참여자가 아니면 ForbiddenError(역할이 MEMBER여도)', async () => {
    const scheduleRepo = fakeScheduleRepository({
      findById: vi.fn().mockResolvedValue({ ...SCHEDULE, participants: [] }),
    });
    const teamRepo = fakeTeamRepository({
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'MEMBER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    await expect(
      submitChangeRequest(scheduleRepo, teamRepo, fakeChangeRequestRepository(), INPUT),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('참여자이지만 LEADER이면 ForbiddenError(canSubmitChangeRequest는 MEMBER 전용)', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'LEADER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    await expect(
      submitChangeRequest(scheduleRepo, teamRepo, fakeChangeRequestRepository(), INPUT),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('참여자이면서 MEMBER이면 PENDING 요청을 생성한다', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'MEMBER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    const created = {
      id: 'cr1',
      scheduleId: 's1',
      requestedByUserId: 'u1',
      status: 'PENDING' as const,
      desiredStartAt: INPUT.desiredStartAt,
      desiredEndAt: INPUT.desiredEndAt,
      reason: INPUT.reason,
      createdAt: '2026-09-09T00:00:00.000Z',
      decidedAt: null,
    };
    const changeRequestRepo = fakeChangeRequestRepository({
      create: vi.fn().mockResolvedValue(created),
    });

    const result = await submitChangeRequest(scheduleRepo, teamRepo, changeRequestRepo, INPUT);

    expect(result).toEqual(created);
    expect(result.status).toBe('PENDING');
  });
});

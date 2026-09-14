import { describe, it, expect, vi } from 'vitest';
import { listChangeRequests } from '../../../../src/application/change-request/list-change-requests.usecase';
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
  participants: [],
};

const INPUT = { scheduleId: 's1', actorUserId: 'u1' };

describe('listChangeRequests', () => {
  it('일정을 찾을 수 없으면 NotFoundError', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(null) });

    await expect(
      listChangeRequests(scheduleRepo, fakeTeamRepository(), fakeChangeRequestRepository(), INPUT),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('팀 비소속(canAccessTeamChat 실패)이면 ForbiddenError', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({ findMembership: vi.fn().mockResolvedValue(null) });

    await expect(
      listChangeRequests(scheduleRepo, teamRepo, fakeChangeRequestRepository(), INPUT),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('팀 구성원이면 제출자가 아니어도(팀장 포함) 해당 일정의 변경 요청 전체를 조회할 수 있다', async () => {
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
    const changeRequests = [
      {
        id: 'cr1',
        scheduleId: 's1',
        requestedByUserId: 'u2',
        status: 'PENDING' as const,
        desiredStartAt: '2026-09-10T00:00:00.000Z',
        desiredEndAt: '2026-09-10T01:00:00.000Z',
        reason: null,
        createdAt: '2026-09-09T00:00:00.000Z',
        decidedAt: null,
      },
    ];
    const changeRequestRepo = fakeChangeRequestRepository({
      listBySchedule: vi.fn().mockResolvedValue(changeRequests),
    });

    const result = await listChangeRequests(scheduleRepo, teamRepo, changeRequestRepo, INPUT);

    expect(result).toEqual(changeRequests);
    expect(changeRequestRepo.listBySchedule).toHaveBeenCalledWith('s1');
  });
});

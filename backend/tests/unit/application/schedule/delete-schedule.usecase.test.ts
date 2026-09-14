import { describe, it, expect, vi } from 'vitest';
import { deleteSchedule } from '../../../../src/application/schedule/delete-schedule.usecase';
import { NotFoundError, ForbiddenError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from '../team/fake-team-repository';
import { fakeScheduleRepository } from './fake-schedule-repository';

const TEAM = { id: 'team-1', name: '디자인팀', createdAt: '2026-09-09T00:00:00.000Z' };
const LEADER = {
  id: 'm1',
  teamId: 'team-1',
  userId: 'u1',
  role: 'LEADER' as const,
  createdAt: '2026-09-09T00:00:00.000Z',
};

describe('deleteSchedule', () => {
  it('MEMBER가 삭제 시도하면 ForbiddenError', async () => {
    const teamRepo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue({ ...LEADER, role: 'MEMBER' }),
    });
    await expect(
      deleteSchedule(teamRepo, fakeScheduleRepository(), {
        teamId: 'team-1',
        scheduleId: 's1',
        actorUserId: 'u1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('대상이 없으면(이미 삭제 포함) NotFoundError', async () => {
    const teamRepo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(LEADER),
    });
    const scheduleRepo = fakeScheduleRepository({ softDelete: vi.fn().mockResolvedValue(false) });

    await expect(
      deleteSchedule(teamRepo, scheduleRepo, {
        teamId: 'team-1',
        scheduleId: 's1',
        actorUserId: 'u1',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('LEADER 삭제는 softDelete만 호출한다(하드 삭제 메서드 자체가 없음 — SC2 구조적 보장)', async () => {
    const teamRepo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(LEADER),
    });
    const scheduleRepo = fakeScheduleRepository({ softDelete: vi.fn().mockResolvedValue(true) });

    await deleteSchedule(teamRepo, scheduleRepo, {
      teamId: 'team-1',
      scheduleId: 's1',
      actorUserId: 'u1',
    });

    expect(scheduleRepo.softDelete).toHaveBeenCalledWith('team-1', 's1');
  });
});

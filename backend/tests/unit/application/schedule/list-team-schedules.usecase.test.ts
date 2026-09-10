import { describe, it, expect, vi } from 'vitest';
import { listTeamSchedules } from '../../../../src/application/schedule/list-team-schedules.usecase';
import { NotFoundError, ForbiddenError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from '../team/fake-team-repository';
import { fakeScheduleRepository } from './fake-schedule-repository';

const TEAM = { id: 'team-1', name: '디자인팀', createdAt: '2026-09-09T00:00:00.000Z' };

describe('listTeamSchedules', () => {
  it('팀이 없으면 NotFoundError', async () => {
    const teamRepo = fakeTeamRepository({ findById: vi.fn().mockResolvedValue(null) });
    const scheduleRepo = fakeScheduleRepository();

    await expect(
      listTeamSchedules(teamRepo, scheduleRepo, { teamId: 'nope', actorUserId: 'u1' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('팀 비소속이면 ForbiddenError', async () => {
    const teamRepo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(null),
    });
    const scheduleRepo = fakeScheduleRepository();

    await expect(
      listTeamSchedules(teamRepo, scheduleRepo, { teamId: 'team-1', actorUserId: 'u1' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('SC1: 조회는 teamId만으로 이루어지며 기간 조건이 섞여 들어가지 않는다', async () => {
    const teamRepo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'MEMBER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    const scheduleRepo = fakeScheduleRepository({
      listActiveByTeam: vi.fn().mockResolvedValue([]),
    });

    await listTeamSchedules(teamRepo, scheduleRepo, { teamId: 'team-1', actorUserId: 'u1' });

    // listActiveByTeam은 teamId 한 개의 인자만 받는 시그니처이므로, 아래 단언은
    // "호출 시 날짜/기간 관련 인자가 전달되지 않았음"을 그대로 증명한다.
    expect(scheduleRepo.listActiveByTeam).toHaveBeenCalledWith('team-1');
    expect(scheduleRepo.listActiveByTeam).toHaveBeenCalledTimes(1);
  });
});

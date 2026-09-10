import { describe, it, expect, vi } from 'vitest';
import { createSchedule } from '../../../../src/application/schedule/create-schedule.usecase';
import { NotFoundError, ForbiddenError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from '../team/fake-team-repository';
import { fakeScheduleRepository } from './fake-schedule-repository';

const TEAM = { id: 'team-1', name: '디자인팀', createdAt: '2026-09-09T00:00:00.000Z' };
const INPUT = {
  teamId: 'team-1',
  actorUserId: 'u1',
  title: '주간 회의',
  startAt: '2026-09-10T01:00:00.000Z',
  endAt: '2026-09-10T02:00:00.000Z',
  participantUserIds: ['u1'],
};

describe('createSchedule', () => {
  it('팀이 없으면 NotFoundError', async () => {
    const teamRepo = fakeTeamRepository({ findById: vi.fn().mockResolvedValue(null) });
    await expect(createSchedule(teamRepo, fakeScheduleRepository(), INPUT)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('MEMBER가 생성 시도하면 ForbiddenError', async () => {
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
    await expect(createSchedule(teamRepo, fakeScheduleRepository(), INPUT)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('LEADER는 생성 성공, conflictWarnings는 항상 빈 배열이다(BE-10 이전 스텁)', async () => {
    const schedule = {
      id: 's1',
      teamId: 'team-1',
      title: '주간 회의',
      startAt: INPUT.startAt,
      endAt: INPUT.endAt,
      createdAt: '2026-09-09T00:00:00.000Z',
      deletedAt: null,
      participants: [],
    };
    const teamRepo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'LEADER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    const scheduleRepo = fakeScheduleRepository({ create: vi.fn().mockResolvedValue(schedule) });

    const result = await createSchedule(teamRepo, scheduleRepo, INPUT);

    expect(result.schedule).toEqual(schedule);
    expect(result.conflictWarnings).toEqual([]);
  });

  it('참여자 시간대가 겹치는 기존 일정이 있으면 conflictWarnings를 채우되 저장은 정상 진행한다(SC4, BE-10)', async () => {
    const schedule = {
      id: 's1',
      teamId: 'team-1',
      title: '주간 회의',
      startAt: INPUT.startAt,
      endAt: INPUT.endAt,
      createdAt: '2026-09-09T00:00:00.000Z',
      deletedAt: null,
      participants: [],
    };
    const conflicting = {
      id: 'existing-1',
      teamId: 'team-1',
      title: '고객사 미팅',
      startAt: '2026-09-10T00:30:00.000Z',
      endAt: '2026-09-10T01:30:00.000Z',
      createdAt: '2026-09-01T00:00:00.000Z',
      deletedAt: null,
      participants: [
        { id: 'p1', scheduleId: 'existing-1', userId: 'u1', createdAt: '2026-09-01T00:00:00.000Z' },
      ],
    };
    const teamRepo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'LEADER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    const scheduleRepo = fakeScheduleRepository({
      listActiveByTeam: vi.fn().mockResolvedValue([conflicting]),
      create: vi.fn().mockResolvedValue(schedule),
    });

    const result = await createSchedule(teamRepo, scheduleRepo, INPUT);

    expect(scheduleRepo.create).toHaveBeenCalled(); // 저장은 차단되지 않는다(SC4)
    expect(result.conflictWarnings).toEqual([
      {
        conflictingScheduleId: 'existing-1',
        conflictingUserId: 'u1',
        conflictingScheduleTitle: '고객사 미팅',
      },
    ]);
  });
});

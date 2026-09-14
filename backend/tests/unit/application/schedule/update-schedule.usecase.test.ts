import { describe, it, expect, vi } from 'vitest';
import { updateSchedule } from '../../../../src/application/schedule/update-schedule.usecase';
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
const INPUT = {
  teamId: 'team-1',
  scheduleId: 's1',
  actorUserId: 'u1',
  title: '수정된 회의',
  startAt: '2026-09-10T01:00:00.000Z',
  endAt: '2026-09-10T02:00:00.000Z',
  participantUserIds: ['u1'],
};

describe('updateSchedule', () => {
  it('팀이 없으면 NotFoundError', async () => {
    const teamRepo = fakeTeamRepository({ findById: vi.fn().mockResolvedValue(null) });
    await expect(updateSchedule(teamRepo, fakeScheduleRepository(), INPUT)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('MEMBER가 수정 시도하면 ForbiddenError', async () => {
    const teamRepo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue({ ...LEADER, role: 'MEMBER' }),
    });
    await expect(updateSchedule(teamRepo, fakeScheduleRepository(), INPUT)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('리포지토리가 null(대상 없음)을 반환하면 NotFoundError', async () => {
    const teamRepo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(LEADER),
    });
    const scheduleRepo = fakeScheduleRepository({ update: vi.fn().mockResolvedValue(null) });

    await expect(updateSchedule(teamRepo, scheduleRepo, INPUT)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('LEADER는 수정 성공, conflictWarnings는 빈 배열이다', async () => {
    const schedule = {
      id: 's1',
      teamId: 'team-1',
      title: '수정된 회의',
      startAt: INPUT.startAt,
      endAt: INPUT.endAt,
      createdAt: '2026-09-09T00:00:00.000Z',
      deletedAt: null,
      participants: [],
    };
    const teamRepo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(LEADER),
    });
    const scheduleRepo = fakeScheduleRepository({ update: vi.fn().mockResolvedValue(schedule) });

    const result = await updateSchedule(teamRepo, scheduleRepo, INPUT);

    expect(result.schedule).toEqual(schedule);
    expect(result.conflictWarnings).toEqual([]);
  });

  it('자기 자신은 충돌 비교 대상에서 제외한다(BE-10)', async () => {
    const schedule = {
      id: 's1',
      teamId: 'team-1',
      title: '수정된 회의',
      startAt: INPUT.startAt,
      endAt: INPUT.endAt,
      createdAt: '2026-09-09T00:00:00.000Z',
      deletedAt: null,
      participants: [],
    };
    const selfBeforeUpdate = {
      id: 's1', // input.scheduleId와 동일 — 필터링되어야 함
      teamId: 'team-1',
      title: '수정 전 제목',
      startAt: INPUT.startAt,
      endAt: INPUT.endAt,
      createdAt: '2026-09-09T00:00:00.000Z',
      deletedAt: null,
      participants: [
        { id: 'p1', scheduleId: 's1', userId: 'u1', createdAt: '2026-09-09T00:00:00.000Z' },
      ],
    };
    const teamRepo = fakeTeamRepository({
      findById: vi.fn().mockResolvedValue(TEAM),
      findMembership: vi.fn().mockResolvedValue(LEADER),
    });
    const scheduleRepo = fakeScheduleRepository({
      listActiveByTeam: vi.fn().mockResolvedValue([selfBeforeUpdate]),
      update: vi.fn().mockResolvedValue(schedule),
    });

    const result = await updateSchedule(teamRepo, scheduleRepo, {
      ...INPUT,
      participantUserIds: ['u1'],
    });

    expect(result.conflictWarnings).toEqual([]);
  });
});

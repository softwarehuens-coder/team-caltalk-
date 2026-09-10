import type { TeamRepository } from '../../domain/team/team.repository';
import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import type { Schedule, ScheduleConflictWarning } from '../../domain/schedule/schedule.entity';
import { canEditSchedule } from '../../domain/permission/permission.policy';
import { detectScheduleConflicts } from '../../domain/schedule/schedule-conflict';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';

export interface CreateScheduleInput {
  teamId: string;
  actorUserId: string;
  title: string;
  startAt: string;
  endAt: string;
  participantUserIds: string[];
}

export interface ScheduleWriteResult {
  schedule: Schedule;
  conflictWarnings: ScheduleConflictWarning[];
}

// UC3. LEADER만 생성 가능(canEditSchedule SSOT 경유). 저장 직전 UC9/SC4
// (schedule-conflict.ts, BE-10)를 호출해 conflictWarnings를 실제 값으로 채우되,
// 경고가 있어도 저장 자체는 차단하지 않는다(SC4 — 항상 201을 반환한다).
export async function createSchedule(
  teamRepository: TeamRepository,
  scheduleRepository: ScheduleRepository,
  input: CreateScheduleInput,
): Promise<ScheduleWriteResult> {
  const team = await teamRepository.findById(input.teamId);
  if (!team) {
    throw new NotFoundError('TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
  }

  const membership = await teamRepository.findMembership(input.teamId, input.actorUserId);
  if (!canEditSchedule(membership?.role ?? null)) {
    throw new ForbiddenError('FORBIDDEN', '일정을 생성할 권한이 없습니다.');
  }

  const existingSchedules = await scheduleRepository.listActiveByTeam(input.teamId);
  const conflictWarnings = detectScheduleConflicts(
    { startAt: input.startAt, endAt: input.endAt, participantUserIds: input.participantUserIds },
    existingSchedules.map((s) => ({
      id: s.id,
      title: s.title,
      startAt: s.startAt,
      endAt: s.endAt,
      participantUserIds: s.participants.map((p) => p.userId),
    })),
  );

  const schedule = await scheduleRepository.create({
    teamId: input.teamId,
    title: input.title,
    startAt: input.startAt,
    endAt: input.endAt,
    participantUserIds: input.participantUserIds,
  });

  return { schedule, conflictWarnings };
}

import type { TeamRepository } from '../../domain/team/team.repository';
import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import { canEditSchedule } from '../../domain/permission/permission.policy';
import { detectScheduleConflicts } from '../../domain/schedule/schedule-conflict';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';
import type { ScheduleWriteResult } from './create-schedule.usecase';

export interface UpdateScheduleInput {
  teamId: string;
  scheduleId: string;
  actorUserId: string;
  title: string;
  startAt: string;
  endAt: string;
  participantUserIds: string[];
}

// UC3. LEADER만 수정 가능(canEditSchedule SSOT 경유). 저장 직전 UC9/SC4를 호출해
// conflictWarnings를 채우되(자기 자신은 비교 대상에서 제외), 경고가 있어도 저장은
// 차단하지 않는다(SC4 — 항상 200을 반환한다).
export async function updateSchedule(
  teamRepository: TeamRepository,
  scheduleRepository: ScheduleRepository,
  input: UpdateScheduleInput,
): Promise<ScheduleWriteResult> {
  const team = await teamRepository.findById(input.teamId);
  if (!team) {
    throw new NotFoundError('TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
  }

  const membership = await teamRepository.findMembership(input.teamId, input.actorUserId);
  if (!canEditSchedule(membership?.role ?? null)) {
    throw new ForbiddenError('FORBIDDEN', '일정을 수정할 권한이 없습니다.');
  }

  const existingSchedules = await scheduleRepository.listActiveByTeam(input.teamId);
  const conflictWarnings = detectScheduleConflicts(
    { startAt: input.startAt, endAt: input.endAt, participantUserIds: input.participantUserIds },
    existingSchedules
      .filter((s) => s.id !== input.scheduleId)
      .map((s) => ({
        id: s.id,
        title: s.title,
        startAt: s.startAt,
        endAt: s.endAt,
        participantUserIds: s.participants.map((p) => p.userId),
      })),
  );

  const schedule = await scheduleRepository.update(input.teamId, input.scheduleId, {
    title: input.title,
    startAt: input.startAt,
    endAt: input.endAt,
    participantUserIds: input.participantUserIds,
  });
  if (!schedule) {
    throw new NotFoundError('SCHEDULE_NOT_FOUND', '일정을 찾을 수 없습니다.');
  }

  return { schedule, conflictWarnings };
}

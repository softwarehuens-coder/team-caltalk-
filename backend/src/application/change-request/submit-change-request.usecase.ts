import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import type { TeamRepository } from '../../domain/team/team.repository';
import type { ChangeRequestRepository } from '../../domain/change-request/change-request.repository';
import type { ChangeRequest } from '../../domain/change-request/change-request.entity';
import { canSubmitChangeRequest } from '../../domain/permission/permission.policy';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';

export interface SubmitChangeRequestInput {
  scheduleId: string;
  actorUserId: string;
  desiredStartAt: string;
  desiredEndAt: string;
  reason: string | null;
}

// UC6. canSubmitChangeRequest(SSOT, MEMBER 전용)와 "자신과 관련된 일정의 참여자
// 한정"(도메인정의서 3장) 두 조건을 모두 만족해야 한다. 후자는 role만으로 판단할 수
// 없는 일정별 참여자 목록 조회이므로 permission.policy.ts의 범위(role 기반 판단)를
// 벗어나며, 이 유스케이스가 직접 확인한다(BE-3 완료 시점에 확정된 함수 시그니처).
export async function submitChangeRequest(
  scheduleRepository: ScheduleRepository,
  teamRepository: TeamRepository,
  changeRequestRepository: ChangeRequestRepository,
  input: SubmitChangeRequestInput,
): Promise<ChangeRequest> {
  const schedule = await scheduleRepository.findById(input.scheduleId);
  if (!schedule) {
    throw new NotFoundError('SCHEDULE_NOT_FOUND', '일정을 찾을 수 없습니다.');
  }

  const membership = await teamRepository.findMembership(schedule.teamId, input.actorUserId);
  const isParticipant = schedule.participants.some((p) => p.userId === input.actorUserId);
  if (!canSubmitChangeRequest(membership?.role ?? null) || !isParticipant) {
    throw new ForbiddenError(
      'FORBIDDEN',
      '자신과 관련된 일정에 대해서만 변경을 요청할 수 있습니다.',
    );
  }

  return changeRequestRepository.create({
    scheduleId: input.scheduleId,
    requestedByUserId: input.actorUserId,
    desiredStartAt: input.desiredStartAt,
    desiredEndAt: input.desiredEndAt,
    reason: input.reason,
  });
}

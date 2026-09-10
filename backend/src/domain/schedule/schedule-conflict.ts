import type { ScheduleConflictWarning } from './schedule.entity';

// UC9/SC4(Should, BE-10). docs/1-domain-definition.md 3장 "일정 충돌" 정의
// ("동일 팀원이 참여자로 등록된 둘 이상의 일정이 겹치는 시간대")를 그대로 코드화한
// 순수 함수. 저장 자체를 차단하지 않으며(SC4), 이 모듈을 제거하고 create/update
// 유스케이스에서 호출만 빼면 conflictWarnings가 다시 빈 배열 스텁으로 돌아갈 뿐
// 나머지 BE-5 기능(생성/수정/삭제/조회)은 전혀 영향받지 않는다(1.6절 "작은 반전성").

export interface ScheduleConflictCandidate {
  startAt: string;
  endAt: string;
  participantUserIds: string[];
}

export interface ExistingScheduleForConflictCheck {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  participantUserIds: string[];
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  // 반개구간 [start, end)로 취급한다 — 한 일정이 끝나는 시각에 다음 일정이 바로
  // 시작하는 경우(맞닿음)는 겹침으로 보지 않는다.
  return aStart < bEnd && bStart < aEnd;
}

export function detectScheduleConflicts(
  candidate: ScheduleConflictCandidate,
  otherActiveSchedules: ExistingScheduleForConflictCheck[],
): ScheduleConflictWarning[] {
  const candidateStart = new Date(candidate.startAt).getTime();
  const candidateEnd = new Date(candidate.endAt).getTime();

  const warnings: ScheduleConflictWarning[] = [];
  for (const existing of otherActiveSchedules) {
    const existingStart = new Date(existing.startAt).getTime();
    const existingEnd = new Date(existing.endAt).getTime();
    if (!overlaps(candidateStart, candidateEnd, existingStart, existingEnd)) {
      continue;
    }

    for (const userId of candidate.participantUserIds) {
      if (existing.participantUserIds.includes(userId)) {
        warnings.push({
          conflictingScheduleId: existing.id,
          conflictingUserId: userId,
          conflictingScheduleTitle: existing.title,
        });
      }
    }
  }
  return warnings;
}

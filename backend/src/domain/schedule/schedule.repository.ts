import type { Schedule } from './schedule.entity';

export interface CreateScheduleInput {
  teamId: string;
  title: string;
  startAt: string;
  endAt: string;
  participantUserIds: string[];
}

export interface UpdateScheduleInput {
  title: string;
  startAt: string;
  endAt: string;
  participantUserIds: string[];
}

// 인터페이스만 정의(docs/4-project-structure.md 2.2절) — 구현은 infrastructure에 위치.
//
// listActiveByTeam이 teamId 하나만 받는다는 사실 자체가 SC1("기간 제한 없이 전체
// 일정 조회") 불변조건을 타입 레벨에서 강제한다 — 이 인터페이스에는 날짜 범위를
// 넘길 방법 자체가 없다(docs/4-project-structure.md 4.2절 SC1 대응).
export interface ScheduleRepository {
  create(input: CreateScheduleInput): Promise<Schedule>;
  update(teamId: string, scheduleId: string, input: UpdateScheduleInput): Promise<Schedule | null>;
  // 소프트 삭제(schedules.deleted_at UPDATE)만 노출한다 — 이 인터페이스에는 실제
  // DELETE를 수행하는 메서드가 존재하지 않으므로, 이 경로로는 채팅 이력에 대한
  // CASCADE가 구조적으로 발생할 수 없다(CLAUDE.md 도메인 불변조건).
  softDelete(teamId: string, scheduleId: string): Promise<boolean>;
  listActiveByTeam(teamId: string): Promise<Schedule[]>;
  // 소프트 삭제 여부와 무관하게 조회한다 — BE-6 채팅 이력 조회(SC2)는 일정이
  // 삭제되어도 계속 가능해야 하므로, deleted_at IS NULL 필터를 적용하지 않는다.
  findById(scheduleId: string): Promise<Schedule | null>;
}

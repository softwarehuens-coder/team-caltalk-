// schedules/schedule_participants 테이블 대응(database/schema.sql). swagger.json
// Schedule/ScheduleParticipant 스키마와 필드명을 맞춘다.

export interface ScheduleParticipant {
  id: string;
  scheduleId: string;
  userId: string;
  createdAt: string;
}

export interface Schedule {
  id: string;
  teamId: string;
  title: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  deletedAt: string | null;
  participants: ScheduleParticipant[];
}

// UC9/SC4(BE-10, Should) 대응 타입. BE-10 구현 전까지 항상 빈 배열로만 쓰인다
// (docs/4-project-structure.md 1.6절 "작은 반전성" — 스텁 상태로도 나머지 기능에 영향 없음).
export interface ScheduleConflictWarning {
  conflictingScheduleId: string;
  conflictingUserId: string;
  conflictingScheduleTitle: string;
}

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

export interface CreateScheduleRequest {
  title: string;
  startAt: string;
  endAt: string;
  participantUserIds: string[];
}

export interface UpdateScheduleRequest {
  title: string;
  startAt: string;
  endAt: string;
  participantUserIds: string[];
}

export interface ScheduleConflictWarning {
  conflictingScheduleId: string;
  conflictingUserId: string;
  conflictingScheduleTitle: string;
}

export interface ScheduleCreateResponse {
  schedule: Schedule;
  conflictWarnings: ScheduleConflictWarning[];
}

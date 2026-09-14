import { del, get, post, put } from '../../../shared/api/http-client';
import type {
  CreateScheduleRequest,
  Schedule,
  ScheduleCreateResponse,
  UpdateScheduleRequest,
} from '../../../shared/types/schedule.types';
import type { CalendarViewMode } from '../types/calendar-view.types';

export interface GetTeamSchedulesParams {
  view: CalendarViewMode;
  date: string;
}

export function getTeamSchedules(teamId: string, params: GetTeamSchedulesParams): Promise<Schedule[]> {
  const query = new URLSearchParams({ view: params.view, date: params.date });
  return get<Schedule[]>(`/teams/${teamId}/schedules?${query.toString()}`);
}

export function createSchedule(teamId: string, body: CreateScheduleRequest): Promise<ScheduleCreateResponse> {
  return post<ScheduleCreateResponse>(`/teams/${teamId}/schedules`, body);
}

export function updateSchedule(
  teamId: string,
  scheduleId: string,
  body: UpdateScheduleRequest,
): Promise<ScheduleCreateResponse> {
  return put<ScheduleCreateResponse>(`/teams/${teamId}/schedules/${scheduleId}`, body);
}

export function deleteSchedule(teamId: string, scheduleId: string): Promise<void> {
  return del<void>(`/teams/${teamId}/schedules/${scheduleId}`);
}

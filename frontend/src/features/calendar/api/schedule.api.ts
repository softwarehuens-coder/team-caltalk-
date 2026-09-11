import { get } from '../../../shared/api/http-client';
import type { Schedule } from '../../../shared/types/schedule.types';
import type { CalendarViewMode } from '../types/calendar-view.types';

export interface GetTeamSchedulesParams {
  view: CalendarViewMode;
  date: string;
}

export function getTeamSchedules(teamId: string, params: GetTeamSchedulesParams): Promise<Schedule[]> {
  const query = new URLSearchParams({ view: params.view, date: params.date });
  return get<Schedule[]>(`/teams/${teamId}/schedules?${query.toString()}`);
}

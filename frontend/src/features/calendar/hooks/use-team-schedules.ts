import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-error';
import type { Schedule } from '../../../shared/types/schedule.types';
import { getTeamSchedules } from '../api/schedule.api';
import type { CalendarViewMode } from '../types/calendar-view.types';

export interface UseTeamSchedulesResult {
  schedules: Schedule[];
  isLoading: boolean;
  error: ApiError | null;
  refresh(): Promise<void>;
}

export function useTeamSchedules(
  teamId: string | null,
  view: CalendarViewMode,
  date: string,
): UseTeamSchedulesResult {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    if (!teamId) {
      setSchedules([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getTeamSchedules(teamId, { view, date });
      setSchedules(result);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN_ERROR', '일정을 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [teamId, view, date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { schedules, isLoading, error, refresh };
}

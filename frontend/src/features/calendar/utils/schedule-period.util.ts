import type { Schedule } from '../../../shared/types/schedule.types';
import { formatDateParam } from './calendar-date.util';

export function groupSchedulesByDay(schedules: Schedule[], days: Date[]): Map<string, Schedule[]> {
  const result = new Map<string, Schedule[]>();

  for (const day of days) {
    result.set(formatDateParam(day), []);
  }

  for (const schedule of schedules) {
    if (schedule.deletedAt !== null) {
      continue;
    }

    const key = formatDateParam(new Date(schedule.startAt));
    const bucket = result.get(key);
    if (bucket) {
      bucket.push(schedule);
    }
  }

  return result;
}

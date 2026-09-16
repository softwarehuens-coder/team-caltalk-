import type { Schedule } from '../../../shared/types/schedule.types';
import { addDays, formatDateParam } from './calendar-date.util';

export function groupSchedulesByDay(schedules: Schedule[], days: Date[]): Map<string, Schedule[]> {
  const result = new Map<string, Schedule[]>();

  for (const day of days) {
    result.set(formatDateParam(day), []);
  }

  for (const schedule of schedules) {
    if (schedule.deletedAt !== null) {
      continue;
    }

    // 여러 날에 걸친 일정(예: 09/21~09/24 출장)은 시작일 하루에만 표시하지 않고,
    // 종료일까지 매일 칩을 노출해 달력만 보고도 기간을 알 수 있게 한다.
    const endKey = formatDateParam(new Date(schedule.endAt));
    let cursor = new Date(schedule.startAt);

    while (formatDateParam(cursor) <= endKey) {
      const bucket = result.get(formatDateParam(cursor));
      if (bucket) {
        bucket.push(schedule);
      }
      cursor = addDays(cursor, 1);
    }
  }

  return result;
}

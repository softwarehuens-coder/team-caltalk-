import type { Schedule } from '../../../shared/types/schedule.types';
import { formatDateParam, isToday } from '../utils/calendar-date.util';
import { ScheduleChip } from './ScheduleChip';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export interface AgendaListViewProps {
  days: Date[];
  schedulesByDay: Map<string, Schedule[]>;
  onScheduleClick(schedule: Schedule): void;
}

export function AgendaListView({ days, schedulesByDay, onScheduleClick }: AgendaListViewProps) {
  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => {
        const key = formatDateParam(day);
        const daySchedules = schedulesByDay.get(key) ?? [];
        const today = isToday(day);

        return (
          <div key={key} className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className={`text-sm font-bold ${today ? 'text-primary-600' : 'text-gray-900'}`}>
              {day.getMonth() + 1}월 {day.getDate()}일 ({WEEKDAY_LABELS[day.getDay()]})
            </h3>
            <div className="mt-2 flex flex-col gap-1">
              {daySchedules.length === 0 ? (
                <p className="text-xs text-gray-400">일정 없음</p>
              ) : (
                daySchedules.map((schedule) => (
                  <ScheduleChip key={schedule.id} schedule={schedule} onClick={onScheduleClick} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

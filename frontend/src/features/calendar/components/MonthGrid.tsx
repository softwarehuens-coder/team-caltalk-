import type { Schedule } from '../../../shared/types/schedule.types';
import { formatDateParam, isToday } from '../utils/calendar-date.util';
import { ScheduleChip } from './ScheduleChip';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export interface MonthGridProps {
  days: Date[];
  schedulesByDay: Map<string, Schedule[]>;
  anchorMonth: number;
  onScheduleClick(schedule: Schedule): void;
  onScheduleEditClick?(schedule: Schedule): void;
  onScheduleDeleteClick?(schedule: Schedule): void;
}

export function MonthGrid({
  days,
  schedulesByDay,
  anchorMonth,
  onScheduleClick,
  onScheduleEditClick,
  onScheduleDeleteClick,
}: MonthGridProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2 text-center text-xs text-gray-400">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = formatDateParam(day);
          const daySchedules = schedulesByDay.get(key) ?? [];
          const isOtherMonth = day.getMonth() !== anchorMonth;
          const today = isToday(day);

          return (
            <div
              key={key}
              className={`min-h-24 border-b border-r border-gray-200 p-1 ${today ? 'bg-primary-50' : ''}`}
            >
              <div className={`text-xs ${isOtherMonth ? 'text-gray-400' : 'text-gray-900'} ${today ? 'font-bold' : ''}`}>
                {day.getDate()}
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {daySchedules.map((schedule) => (
                  <ScheduleChip
                    key={schedule.id}
                    schedule={schedule}
                    onClick={onScheduleClick}
                    onEditClick={onScheduleEditClick}
                    onDeleteClick={onScheduleDeleteClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

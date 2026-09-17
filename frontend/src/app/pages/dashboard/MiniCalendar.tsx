import { formatDateParam, getMonthGridDays, isToday } from '../../../features/calendar/utils/calendar-date.util';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export interface MiniCalendarProps {
  anchorDate: Date;
  selectedDate: Date;
  scheduleDates: ReadonlySet<string>;
  onSelectDate(date: Date): void;
  onPrevMonth(): void;
  onNextMonth(): void;
}

export function MiniCalendar({
  anchorDate,
  selectedDate,
  scheduleDates,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: MiniCalendarProps) {
  const days = getMonthGridDays(anchorDate);
  const selectedKey = formatDateParam(selectedDate);

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="이전 달"
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-50"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {anchorDate.getFullYear()}년 {anchorDate.getMonth() + 1}월
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="다음 달"
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-50"
        >
          ›
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-xs text-gray-400">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {days.map((day) => {
          const key = formatDateParam(day);
          const isOtherMonth = day.getMonth() !== anchorDate.getMonth();
          const isSelected = key === selectedKey;
          const hasSchedule = scheduleDates.has(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`mx-auto flex h-7 w-7 flex-col items-center justify-center rounded-full ${
                isSelected
                  ? 'bg-primary-600 font-bold text-white'
                  : isToday(day)
                    ? 'font-bold text-primary-600'
                    : isOtherMonth
                      ? 'text-gray-300'
                      : 'text-gray-700'
              }`}
            >
              {day.getDate()}
              <span
                className={`-mt-0.5 h-1 w-1 rounded-full ${
                  hasSchedule ? (isSelected ? 'bg-white' : 'bg-accent-500') : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

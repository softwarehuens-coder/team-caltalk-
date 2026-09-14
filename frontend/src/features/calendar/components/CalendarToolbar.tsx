import type { CalendarViewMode } from '../types/calendar-view.types';

export interface CalendarToolbarProps {
  view: CalendarViewMode;
  onViewChange(view: CalendarViewMode): void;
  periodLabel: string;
  onPrev(): void;
  onNext(): void;
  onToday(): void;
  isLeader: boolean;
  onCreateClick?(): void;
}

const VIEW_OPTIONS: { mode: CalendarViewMode; label: string }[] = [
  { mode: 'month', label: '월' },
  { mode: 'week', label: '주' },
  { mode: 'day', label: '일' },
];

export function CalendarToolbar({
  view,
  onViewChange,
  periodLabel,
  onPrev,
  onNext,
  onToday,
  isLeader,
  onCreateClick,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          이전
        </button>
        <button
          type="button"
          onClick={onToday}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          오늘
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          다음
        </button>
        <span className="text-lg font-bold text-gray-900">{periodLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            onClick={() => onViewChange(option.mode)}
            className={
              option.mode === view
                ? 'rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700'
                : 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50'
            }
          >
            {option.label}
          </button>
        ))}
        {isLeader && (
          <button
            type="button"
            onClick={onCreateClick}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            + 일정 생성
          </button>
        )}
      </div>
    </div>
  );
}

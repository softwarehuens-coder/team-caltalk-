import { useCallback, useMemo, useState } from 'react';
import { addDays, addMonths, formatDateParam, getWeekDays } from '../utils/calendar-date.util';
import type { CalendarViewMode } from '../types/calendar-view.types';

export interface UseCalendarNavigationResult {
  view: CalendarViewMode;
  anchorDate: Date;
  periodLabel: string;
  dateParam: string;
  setView(view: CalendarViewMode): void;
  goPrev(): void;
  goNext(): void;
  goToday(): void;
}

function buildPeriodLabel(view: CalendarViewMode, anchorDate: Date): string {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth() + 1;
  const day = anchorDate.getDate();

  if (view === 'month') {
    return `${year}년 ${month}월`;
  }

  if (view === 'day') {
    return `${year}년 ${month}월 ${day}일`;
  }

  const weekDays = getWeekDays(anchorDate);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[weekDays.length - 1];
  const startLabel = `${weekStart.getFullYear()}년 ${weekStart.getMonth() + 1}월 ${weekStart.getDate()}일`;
  const endLabel = `${weekEnd.getMonth() + 1}월 ${weekEnd.getDate()}일`;
  return `${startLabel} - ${endLabel}`;
}

export function useCalendarNavigation(): UseCalendarNavigationResult {
  const [view, setView] = useState<CalendarViewMode>('month');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());

  const goPrev = useCallback(() => {
    setAnchorDate((current) => {
      if (view === 'month') {
        return addMonths(current, -1);
      }
      if (view === 'week') {
        return addDays(current, -7);
      }
      return addDays(current, -1);
    });
  }, [view]);

  const goNext = useCallback(() => {
    setAnchorDate((current) => {
      if (view === 'month') {
        return addMonths(current, 1);
      }
      if (view === 'week') {
        return addDays(current, 7);
      }
      return addDays(current, 1);
    });
  }, [view]);

  const goToday = useCallback(() => {
    setAnchorDate(new Date());
  }, []);

  const periodLabel = useMemo(() => buildPeriodLabel(view, anchorDate), [view, anchorDate]);
  const dateParam = useMemo(() => formatDateParam(anchorDate), [anchorDate]);

  return { view, anchorDate, periodLabel, dateParam, setView, goPrev, goNext, goToday };
}

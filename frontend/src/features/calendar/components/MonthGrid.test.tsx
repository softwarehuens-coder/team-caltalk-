import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Schedule } from '../../../shared/types/schedule.types';
import { formatDateParam } from '../utils/calendar-date.util';
import { MonthGrid } from './MonthGrid';

function buildSchedule(id: string, title: string): Schedule {
  return {
    id,
    teamId: 't1',
    title,
    startAt: '2026-04-15T01:00:00.000Z',
    endAt: '2026-04-15T02:00:00.000Z',
    createdAt: '2026-04-01T00:00:00.000Z',
    deletedAt: null,
    participants: [],
  };
}

function buildDays(): Date[] {
  const days: Date[] = [];
  for (let i = 29; i <= 31; i += 1) {
    days.push(new Date(2026, 2, i));
  }
  for (let i = 1; i <= 3; i += 1) {
    days.push(new Date(2026, 3, i));
  }
  return days;
}

describe('MonthGrid', () => {
  it('요일 헤더와 날짜, 해당 날짜의 일정 칩을 렌더링한다', () => {
    const days = buildDays();
    const schedule = buildSchedule('s1', '주간 회의');
    const schedulesByDay = new Map<string, Schedule[]>();
    for (const day of days) {
      schedulesByDay.set(formatDateParam(day), []);
    }
    schedulesByDay.set('2026-04-01', [schedule]);

    render(
      <MonthGrid days={days} schedulesByDay={schedulesByDay} anchorMonth={3} onScheduleClick={vi.fn()} />,
    );

    expect(screen.getByText('일')).toBeInTheDocument();
    expect(screen.getByText('토')).toBeInTheDocument();
    expect(screen.getByText('주간 회의')).toBeInTheDocument();
  });

  it('일정 칩 클릭 시 onScheduleClick을 해당 schedule과 함께 호출한다', async () => {
    const user = userEvent.setup();
    const days = buildDays();
    const schedule = buildSchedule('s1', '주간 회의');
    const schedulesByDay = new Map<string, Schedule[]>();
    for (const day of days) {
      schedulesByDay.set(formatDateParam(day), []);
    }
    schedulesByDay.set('2026-04-01', [schedule]);
    const onScheduleClick = vi.fn();

    render(
      <MonthGrid days={days} schedulesByDay={schedulesByDay} anchorMonth={3} onScheduleClick={onScheduleClick} />,
    );
    await user.click(screen.getByText('주간 회의'));

    expect(onScheduleClick).toHaveBeenCalledWith(schedule);
  });

  it('오늘 날짜 셀을 강조 표시한다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 1, 9, 0, 0)); // 2026-04-01

    try {
      const days = buildDays();
      const schedulesByDay = new Map<string, Schedule[]>();
      for (const day of days) {
        schedulesByDay.set(formatDateParam(day), []);
      }

      render(
        <MonthGrid days={days} schedulesByDay={schedulesByDay} anchorMonth={3} onScheduleClick={vi.fn()} />,
      );

      const todayCell = screen.getByText('1', { selector: 'div' });
      expect(todayCell.className).toContain('font-bold');
    } finally {
      vi.useRealTimers();
    }
  });
});

import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MiniCalendar } from './MiniCalendar';

describe('MiniCalendar', () => {
  it('현재 연/월 라벨과 오늘 날짜를 강조 표시한다', () => {
    render(
      <MiniCalendar
        anchorDate={new Date(2026, 3, 15)}
        selectedDate={new Date(2026, 3, 15)}
        scheduleDates={new Set()}
        onSelectDate={vi.fn()}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
      />,
    );

    expect(screen.getByText('2026년 4월')).toBeInTheDocument();
  });

  it('일정이 있는 날짜에는 점 표시가 나타난다', () => {
    render(
      <MiniCalendar
        anchorDate={new Date(2026, 3, 15)}
        selectedDate={new Date(2026, 3, 15)}
        scheduleDates={new Set(['2026-04-20'])}
        onSelectDate={vi.fn()}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
      />,
    );

    const day20 = screen.getByRole('button', { name: '20' });
    expect(day20.querySelector('.bg-accent-500')).toBeInTheDocument();
  });

  it('날짜 클릭 시 onSelectDate가 클릭한 날짜로 호출된다', async () => {
    const user = userEvent.setup();
    const onSelectDate = vi.fn();
    render(
      <MiniCalendar
        anchorDate={new Date(2026, 3, 15)}
        selectedDate={new Date(2026, 3, 15)}
        scheduleDates={new Set()}
        onSelectDate={onSelectDate}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '20' }));

    expect(onSelectDate).toHaveBeenCalledTimes(1);
    const calledDate = onSelectDate.mock.calls[0][0] as Date;
    expect(calledDate.getDate()).toBe(20);
    expect(calledDate.getMonth()).toBe(3);
  });

  it('이전/다음 달 버튼 클릭 시 각각의 콜백이 호출된다', async () => {
    const user = userEvent.setup();
    const onPrevMonth = vi.fn();
    const onNextMonth = vi.fn();
    render(
      <MiniCalendar
        anchorDate={new Date(2026, 3, 15)}
        selectedDate={new Date(2026, 3, 15)}
        scheduleDates={new Set()}
        onSelectDate={vi.fn()}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
      />,
    );

    await user.click(screen.getByLabelText('이전 달'));
    await user.click(screen.getByLabelText('다음 달'));

    expect(onPrevMonth).toHaveBeenCalledTimes(1);
    expect(onNextMonth).toHaveBeenCalledTimes(1);
  });
});

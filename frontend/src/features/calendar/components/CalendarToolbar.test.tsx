import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarToolbar } from './CalendarToolbar';

describe('CalendarToolbar', () => {
  it('periodLabel을 렌더링한다', () => {
    render(
      <CalendarToolbar
        view="month"
        onViewChange={vi.fn()}
        periodLabel="2026년 4월"
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        isLeader={false}
      />,
    );

    expect(screen.getByText('2026년 4월')).toBeInTheDocument();
  });

  it('이전/오늘/다음 버튼 클릭 시 각각의 콜백을 호출한다', async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onToday = vi.fn();

    render(
      <CalendarToolbar
        view="month"
        onViewChange={vi.fn()}
        periodLabel="2026년 4월"
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        isLeader={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: '이전' }));
    await user.click(screen.getByRole('button', { name: '오늘' }));
    await user.click(screen.getByRole('button', { name: '다음' }));

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onToday).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('월/주/일 버튼 클릭 시 onViewChange를 해당 뷰 모드로 호출한다', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();

    render(
      <CalendarToolbar
        view="month"
        onViewChange={onViewChange}
        periodLabel="2026년 4월"
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        isLeader={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: '주' }));
    expect(onViewChange).toHaveBeenCalledWith('week');

    await user.click(screen.getByRole('button', { name: '일' }));
    expect(onViewChange).toHaveBeenCalledWith('day');

    await user.click(screen.getByRole('button', { name: '월' }));
    expect(onViewChange).toHaveBeenCalledWith('month');
  });

  it('isLeader가 true이면 일정 생성 버튼을 렌더링하고 클릭 시 onCreateClick을 호출한다', async () => {
    const user = userEvent.setup();
    const onCreateClick = vi.fn();

    render(
      <CalendarToolbar
        view="month"
        onViewChange={vi.fn()}
        periodLabel="2026년 4월"
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        isLeader
        onCreateClick={onCreateClick}
      />,
    );

    const createButton = screen.getByRole('button', { name: /일정 생성/ });
    await user.click(createButton);

    expect(onCreateClick).toHaveBeenCalledTimes(1);
  });

  it('isLeader가 false이면 일정 생성 버튼을 렌더링하지 않는다', () => {
    render(
      <CalendarToolbar
        view="month"
        onViewChange={vi.fn()}
        periodLabel="2026년 4월"
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        isLeader={false}
      />,
    );

    expect(screen.queryByRole('button', { name: /일정 생성/ })).not.toBeInTheDocument();
  });
});

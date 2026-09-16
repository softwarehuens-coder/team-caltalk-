import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Schedule } from '../../../shared/types/schedule.types';
import { formatDateParam } from '../utils/calendar-date.util';
import { AgendaListView } from './AgendaListView';

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

describe('AgendaListView', () => {
  it('1일 뷰: 일정이 있으면 해당 날짜에 일정 칩을 렌더링한다', () => {
    const days = [new Date(2026, 3, 15)];
    const schedule = buildSchedule('s1', '주간 회의');
    const schedulesByDay = new Map<string, Schedule[]>([[formatDateParam(days[0]), [schedule]]]);

    render(<AgendaListView days={days} schedulesByDay={schedulesByDay} onScheduleClick={vi.fn()} />);

    expect(screen.getByText('주간 회의')).toBeInTheDocument();
  });

  it('1일 뷰: 일정이 없으면 빈 상태 문구를 표시한다', () => {
    const days = [new Date(2026, 3, 15)];
    const schedulesByDay = new Map<string, Schedule[]>([[formatDateParam(days[0]), []]]);

    render(<AgendaListView days={days} schedulesByDay={schedulesByDay} onScheduleClick={vi.fn()} />);

    expect(screen.getByText('일정 없음')).toBeInTheDocument();
  });

  it('7일 뷰: 7개의 날짜 섹션을 모두 렌더링한다', () => {
    const days = Array.from({ length: 7 }, (_, i) => new Date(2026, 3, 12 + i));
    const schedulesByDay = new Map<string, Schedule[]>(days.map((day) => [formatDateParam(day), []]));

    render(<AgendaListView days={days} schedulesByDay={schedulesByDay} onScheduleClick={vi.fn()} />);

    expect(screen.getAllByText('일정 없음')).toHaveLength(7);
  });

  it('일정 칩 클릭 시 onScheduleClick을 해당 schedule과 함께 호출한다', async () => {
    const user = userEvent.setup();
    const days = [new Date(2026, 3, 15)];
    const schedule = buildSchedule('s1', '주간 회의');
    const schedulesByDay = new Map<string, Schedule[]>([[formatDateParam(days[0]), [schedule]]]);
    const onScheduleClick = vi.fn();

    render(<AgendaListView days={days} schedulesByDay={schedulesByDay} onScheduleClick={onScheduleClick} />);
    await user.click(screen.getByText('주간 회의'));

    expect(onScheduleClick).toHaveBeenCalledWith(schedule);
  });

  it('onScheduleEditClick/onScheduleDeleteClick을 ScheduleChip에 전달한다 (채팅 패널 없이 바로 수정/삭제)', async () => {
    const user = userEvent.setup();
    const days = [new Date(2026, 3, 15)];
    const schedule = buildSchedule('s1', '주간 회의');
    const schedulesByDay = new Map<string, Schedule[]>([[formatDateParam(days[0]), [schedule]]]);
    const onScheduleEditClick = vi.fn();
    const onScheduleDeleteClick = vi.fn();

    render(
      <AgendaListView
        days={days}
        schedulesByDay={schedulesByDay}
        onScheduleClick={vi.fn()}
        onScheduleEditClick={onScheduleEditClick}
        onScheduleDeleteClick={onScheduleDeleteClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: /수정/ }));
    await user.click(screen.getByRole('button', { name: /삭제/ }));

    expect(onScheduleEditClick).toHaveBeenCalledWith(schedule);
    expect(onScheduleDeleteClick).toHaveBeenCalledWith(schedule);
  });
});

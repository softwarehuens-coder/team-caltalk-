import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Schedule } from '../../../shared/types/schedule.types';
import { ScheduleChip } from './ScheduleChip';

const schedule: Schedule = {
  id: 's1',
  teamId: 't1',
  title: '주간 회의',
  startAt: '2026-04-15T01:00:00.000Z',
  endAt: '2026-04-15T02:00:00.000Z',
  createdAt: '2026-04-01T00:00:00.000Z',
  deletedAt: null,
  participants: [],
};

describe('ScheduleChip', () => {
  it('일정 제목을 렌더링한다', () => {
    render(<ScheduleChip schedule={schedule} onClick={vi.fn()} />);

    expect(screen.getByText('주간 회의')).toBeInTheDocument();
  });

  it('클릭 시 onClick을 해당 schedule과 함께 호출한다', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ScheduleChip schedule={schedule} onClick={onClick} />);

    await user.click(screen.getByText('주간 회의'));

    expect(onClick).toHaveBeenCalledWith(schedule);
  });
});

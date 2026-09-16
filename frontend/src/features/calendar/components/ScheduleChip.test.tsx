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

  it('onEditClick/onDeleteClick을 전달하지 않으면 수정/삭제 아이콘을 렌더링하지 않는다', () => {
    render(<ScheduleChip schedule={schedule} onClick={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /수정/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
  });

  it('수정 아이콘 클릭 시 onEditClick만 호출하고 onClick(상세 진입)은 호출하지 않는다 (채팅 패널 없이 바로 수정)', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onEditClick = vi.fn();
    render(<ScheduleChip schedule={schedule} onClick={onClick} onEditClick={onEditClick} />);

    await user.click(screen.getByRole('button', { name: /수정/ }));

    expect(onEditClick).toHaveBeenCalledWith(schedule);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('삭제 아이콘 클릭 시 onDeleteClick만 호출하고 onClick(상세 진입)은 호출하지 않는다 (채팅 패널 없이 바로 삭제)', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onDeleteClick = vi.fn();
    render(<ScheduleChip schedule={schedule} onClick={onClick} onDeleteClick={onDeleteClick} />);

    await user.click(screen.getByRole('button', { name: /삭제/ }));

    expect(onDeleteClick).toHaveBeenCalledWith(schedule);
    expect(onClick).not.toHaveBeenCalled();
  });
});

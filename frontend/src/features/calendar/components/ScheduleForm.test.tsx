import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../shared/api/api-error';
import type { Schedule, ScheduleCreateResponse } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';
import { toDatetimeLocalInput } from '../utils/schedule-datetime.util';

const createScheduleMock = vi.fn();
const updateScheduleMock = vi.fn();
const deleteScheduleMock = vi.fn();

vi.mock('../api/schedule.api', () => ({
  createSchedule: (...args: unknown[]) => createScheduleMock(...args),
  updateSchedule: (...args: unknown[]) => updateScheduleMock(...args),
  deleteSchedule: (...args: unknown[]) => deleteScheduleMock(...args),
}));

import { ScheduleForm } from './ScheduleForm';

const members: TeamMember[] = [
  { userId: 'u1', email: 'leader@test.com', name: '홍길동', role: 'LEADER', joinedAt: '2026-01-01T00:00:00.000Z' },
  { userId: 'u2', email: 'member@test.com', name: '김철수', role: 'MEMBER', joinedAt: '2026-01-02T00:00:00.000Z' },
];

function buildResponse(overrides: Partial<Schedule> = {}): ScheduleCreateResponse {
  return {
    schedule: {
      id: 's1',
      teamId: 't1',
      title: '주간 회의',
      startAt: new Date(2026, 3, 15, 9, 0).toISOString(),
      endAt: new Date(2026, 3, 15, 10, 0).toISOString(),
      createdAt: '2026-04-01T00:00:00.000Z',
      deletedAt: null,
      participants: [],
      ...overrides,
    },
    conflictWarnings: [],
  };
}

function getForm(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector('form');
  if (!form) {
    throw new Error('form 엘리먼트를 찾을 수 없습니다');
  }
  return form;
}

function fillTitle(user: ReturnType<typeof userEvent.setup>, value: string) {
  return user.type(screen.getByLabelText('제목'), value);
}

function setStart(value: string) {
  fireEvent.change(screen.getByLabelText('시작 일시'), { target: { value } });
}

function setEnd(value: string) {
  fireEvent.change(screen.getByLabelText('종료 일시'), { target: { value } });
}

afterEach(() => {
  createScheduleMock.mockReset();
  updateScheduleMock.mockReset();
  deleteScheduleMock.mockReset();
  vi.restoreAllMocks();
});

describe('ScheduleForm - 생성 모드 유효성 검사', () => {
  it('제목이 비어있으면 에러 메시지를 표시하고 createSchedule을 호출하지 않는다', () => {
    const { container } = render(
      <ScheduleForm teamId="t1" members={members} mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    setStart('2026-04-15T09:00');
    setEnd('2026-04-15T10:00');
    fireEvent.submit(getForm(container));

    expect(screen.getByText('제목을 입력해주세요')).toBeInTheDocument();
    expect(createScheduleMock).not.toHaveBeenCalled();
  });

  it('시작일시가 비어있으면 에러 메시지를 표시하고 createSchedule을 호출하지 않는다', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ScheduleForm teamId="t1" members={members} mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    await fillTitle(user, '주간 회의');
    setEnd('2026-04-15T10:00');
    fireEvent.submit(getForm(container));

    expect(screen.getByText('시작 일시를 입력해주세요')).toBeInTheDocument();
    expect(createScheduleMock).not.toHaveBeenCalled();
  });

  it('종료일시가 비어있으면 에러 메시지를 표시하고 createSchedule을 호출하지 않는다', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ScheduleForm teamId="t1" members={members} mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    await fillTitle(user, '주간 회의');
    setStart('2026-04-15T09:00');
    fireEvent.submit(getForm(container));

    expect(screen.getByText('종료 일시를 입력해주세요')).toBeInTheDocument();
    expect(createScheduleMock).not.toHaveBeenCalled();
  });

  it('종료일시가 시작일시보다 빠르면 에러 메시지를 표시하고 createSchedule을 호출하지 않는다', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ScheduleForm teamId="t1" members={members} mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    await fillTitle(user, '주간 회의');
    setStart('2026-04-15T10:00');
    setEnd('2026-04-15T09:00');
    fireEvent.submit(getForm(container));

    expect(screen.getByText('종료 일시는 시작 일시 이후여야 합니다')).toBeInTheDocument();
    expect(createScheduleMock).not.toHaveBeenCalled();
  });
});

describe('ScheduleForm - 생성 모드 정상 제출', () => {
  it('유효한 입력으로 제출하면 createSchedule을 올바른 인자로 호출하고 성공 시 onSaved를 호출한다', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const response = buildResponse();
    createScheduleMock.mockResolvedValue(response);
    const { container } = render(
      <ScheduleForm teamId="t1" members={members} mode="create" onSaved={onSaved} onCancel={vi.fn()} />,
    );

    await fillTitle(user, '주간 회의');
    setStart('2026-04-15T09:00');
    setEnd('2026-04-15T10:00');
    await user.click(screen.getByLabelText('김철수'));
    fireEvent.submit(getForm(container));

    await waitFor(() => {
      expect(createScheduleMock).toHaveBeenCalledWith('t1', {
        title: '주간 회의',
        startAt: new Date(2026, 3, 15, 9, 0, 0, 0).toISOString(),
        endAt: new Date(2026, 3, 15, 10, 0, 0, 0).toISOString(),
        participantUserIds: ['u2'],
      });
    });
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(response.schedule);
    });
  });

  it('createSchedule이 403으로 실패하면 팀장 권한 안내 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    createScheduleMock.mockRejectedValue(new ApiError(403, 'NOT_LEADER', '권한이 없습니다'));
    const { container } = render(
      <ScheduleForm teamId="t1" members={members} mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    await fillTitle(user, '주간 회의');
    setStart('2026-04-15T09:00');
    setEnd('2026-04-15T10:00');
    fireEvent.submit(getForm(container));

    expect(await screen.findByText('팀장만 일정을 생성/수정할 수 있습니다')).toBeInTheDocument();
  });

  it('createSchedule이 400으로 실패하면 서버 에러 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    createScheduleMock.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', '잘못된 요청입니다'));
    const { container } = render(
      <ScheduleForm teamId="t1" members={members} mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    await fillTitle(user, '주간 회의');
    setStart('2026-04-15T09:00');
    setEnd('2026-04-15T10:00');
    fireEvent.submit(getForm(container));

    expect(await screen.findByText('잘못된 요청입니다')).toBeInTheDocument();
  });

  it('createSchedule이 그 외 에러로 실패하면 일반 에러 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    createScheduleMock.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', '서버 오류'));
    const { container } = render(
      <ScheduleForm teamId="t1" members={members} mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />,
    );

    await fillTitle(user, '주간 회의');
    setStart('2026-04-15T09:00');
    setEnd('2026-04-15T10:00');
    fireEvent.submit(getForm(container));

    expect(await screen.findByText(/오류가 발생했습니다/)).toBeInTheDocument();
  });
});

describe('ScheduleForm - 수정 모드', () => {
  const editSchedule: Schedule = {
    id: 's1',
    teamId: 't1',
    title: '기존 회의',
    startAt: new Date(2026, 3, 15, 9, 0).toISOString(),
    endAt: new Date(2026, 3, 15, 10, 0).toISOString(),
    createdAt: '2026-04-01T00:00:00.000Z',
    deletedAt: null,
    participants: [{ id: 'p1', scheduleId: 's1', userId: 'u2', createdAt: '2026-04-01T00:00:00.000Z' }],
  };

  it('schedule prop으로 초기값(제목/시작일시/종료일시/참여자)을 채운다', () => {
    render(
      <ScheduleForm
        teamId="t1"
        members={members}
        mode="edit"
        schedule={editSchedule}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('제목')).toHaveValue('기존 회의');
    expect(screen.getByLabelText('시작 일시')).toHaveValue(toDatetimeLocalInput(editSchedule.startAt));
    expect(screen.getByLabelText('종료 일시')).toHaveValue(toDatetimeLocalInput(editSchedule.endAt));
    expect(screen.getByLabelText('김철수')).toBeChecked();
    expect(screen.getByLabelText('홍길동')).not.toBeChecked();
  });

  it('수정 후 제출하면 updateSchedule을 올바른 인자로 호출하고 성공 시 onSaved를 호출한다', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const response = buildResponse({ title: '기존 회의(변경)' });
    updateScheduleMock.mockResolvedValue(response);
    const { container } = render(
      <ScheduleForm
        teamId="t1"
        members={members}
        mode="edit"
        schedule={editSchedule}
        onSaved={onSaved}
        onCancel={vi.fn()}
      />,
    );

    await user.clear(screen.getByLabelText('제목'));
    await user.type(screen.getByLabelText('제목'), '기존 회의(변경)');
    fireEvent.submit(getForm(container));

    await waitFor(() => {
      expect(updateScheduleMock).toHaveBeenCalledWith('t1', 's1', {
        title: '기존 회의(변경)',
        startAt: editSchedule.startAt,
        endAt: editSchedule.endAt,
        participantUserIds: ['u2'],
      });
    });
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(response.schedule);
    });
  });

  it('updateSchedule이 403으로 실패하면 팀장 권한 안내 메시지를 표시한다', async () => {
    updateScheduleMock.mockRejectedValue(new ApiError(403, 'NOT_LEADER', '권한이 없습니다'));
    const { container } = render(
      <ScheduleForm
        teamId="t1"
        members={members}
        mode="edit"
        schedule={editSchedule}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.submit(getForm(container));

    expect(await screen.findByText('팀장만 일정을 생성/수정할 수 있습니다')).toBeInTheDocument();
  });
});

describe('ScheduleForm - 삭제', () => {
  const editSchedule: Schedule = {
    id: 's1',
    teamId: 't1',
    title: '기존 회의',
    startAt: new Date(2026, 3, 15, 9, 0).toISOString(),
    endAt: new Date(2026, 3, 15, 10, 0).toISOString(),
    createdAt: '2026-04-01T00:00:00.000Z',
    deletedAt: null,
    participants: [],
  };

  it('생성 모드에서는 삭제 버튼이 노출되지 않는다', () => {
    render(<ScheduleForm teamId="t1" members={members} mode="create" onSaved={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
  });

  it('삭제 버튼 클릭 후 확인(true)하면 deleteSchedule을 호출하고 onDeleted를 호출한다', async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteScheduleMock.mockResolvedValue(undefined);
    render(
      <ScheduleForm
        teamId="t1"
        members={members}
        mode="edit"
        schedule={editSchedule}
        onSaved={vi.fn()}
        onDeleted={onDeleted}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '삭제' }));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(deleteScheduleMock).toHaveBeenCalledWith('t1', 's1');
    });
    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith('s1');
    });
  });

  it('삭제 버튼 클릭 후 확인(false)하면 deleteSchedule을 호출하지 않는다', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <ScheduleForm
        teamId="t1"
        members={members}
        mode="edit"
        schedule={editSchedule}
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '삭제' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteScheduleMock).not.toHaveBeenCalled();
  });

  it('deleteSchedule이 403으로 실패하면 에러 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    deleteScheduleMock.mockRejectedValue(new ApiError(403, 'NOT_LEADER', '권한이 없습니다'));
    render(
      <ScheduleForm
        teamId="t1"
        members={members}
        mode="edit"
        schedule={editSchedule}
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '삭제' }));

    expect(await screen.findByText(/팀장만/)).toBeInTheDocument();
  });
});

describe('ScheduleForm - 취소', () => {
  it('취소 버튼을 클릭하면 API 호출 없이 onCancel을 호출한다', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ScheduleForm teamId="t1" members={members} mode="create" onSaved={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(onCancel).toHaveBeenCalled();
    expect(createScheduleMock).not.toHaveBeenCalled();
    expect(updateScheduleMock).not.toHaveBeenCalled();
    expect(deleteScheduleMock).not.toHaveBeenCalled();
  });
});

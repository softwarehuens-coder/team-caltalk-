import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../shared/api/api-error';
import type { ChangeRequest } from '../../../shared/types/change-request.types';

const submitChangeRequestMock = vi.fn();

vi.mock('../api/change-request.api', () => ({
  submitChangeRequest: (...args: unknown[]) => submitChangeRequestMock(...args),
}));

import { ChangeRequestForm } from './ChangeRequestForm';

function buildChangeRequest(overrides: Partial<ChangeRequest> = {}): ChangeRequest {
  return {
    id: 'cr1',
    scheduleId: 's1',
    requestedByUserId: 'u2',
    status: 'PENDING',
    desiredStartAt: '2026-04-15T09:00:00.000Z',
    desiredEndAt: '2026-04-15T10:00:00.000Z',
    reason: '회의실 변경 필요',
    createdAt: '2026-04-01T00:00:00.000Z',
    decidedAt: null,
    ...overrides,
  };
}

function getForm(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector('form');
  if (!form) {
    throw new Error('form 엘리먼트를 찾을 수 없습니다');
  }
  return form;
}

function setStart(value: string) {
  fireEvent.change(screen.getByLabelText('희망 시작 일시'), { target: { value } });
}

function setEnd(value: string) {
  fireEvent.change(screen.getByLabelText('희망 종료 일시'), { target: { value } });
}

function renderForm(overrides: { onSubmitted?: (cr: ChangeRequest) => void; onCancel?: () => void } = {}) {
  const onSubmitted = overrides.onSubmitted ?? vi.fn();
  const onCancel = overrides.onCancel ?? vi.fn();
  const utils = render(
    <ChangeRequestForm scheduleId="s1" scheduleTitle="주간 회의" onSubmitted={onSubmitted} onCancel={onCancel} />,
  );
  return { ...utils, onSubmitted, onCancel };
}

afterEach(() => {
  submitChangeRequestMock.mockReset();
});

describe('ChangeRequestForm - 필드 렌더링', () => {
  it('희망 시작/종료 일시, 사유, 취소/제출 버튼을 렌더링한다', () => {
    renderForm();

    expect(screen.getByLabelText('희망 시작 일시')).toHaveAttribute('type', 'datetime-local');
    expect(screen.getByLabelText('희망 종료 일시')).toHaveAttribute('type', 'datetime-local');
    expect(screen.getByLabelText('사유').tagName).toBe('TEXTAREA');
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '요청 보내기' })).toBeInTheDocument();
  });
});

describe('ChangeRequestForm - 유효성 검사', () => {
  it('희망 시작 일시가 비어있으면 에러 메시지를 표시하고 API를 호출하지 않는다', () => {
    const { container } = renderForm();

    setEnd('2026-04-15T10:00');
    fireEvent.submit(getForm(container));

    expect(screen.getByText('희망 시작 일시를 입력해주세요')).toBeInTheDocument();
    expect(submitChangeRequestMock).not.toHaveBeenCalled();
  });

  it('희망 종료 일시가 비어있으면 에러 메시지를 표시하고 API를 호출하지 않는다', () => {
    const { container } = renderForm();

    setStart('2026-04-15T09:00');
    fireEvent.submit(getForm(container));

    expect(screen.getByText('희망 종료 일시를 입력해주세요')).toBeInTheDocument();
    expect(submitChangeRequestMock).not.toHaveBeenCalled();
  });

  it('종료 일시가 시작 일시 이후가 아니면 에러 메시지를 표시하고 API를 호출하지 않는다', () => {
    const { container } = renderForm();

    setStart('2026-04-15T10:00');
    setEnd('2026-04-15T10:00');
    fireEvent.submit(getForm(container));

    expect(screen.getByText('종료 일시는 시작 일시 이후여야 합니다')).toBeInTheDocument();
    expect(submitChangeRequestMock).not.toHaveBeenCalled();
  });
});

describe('ChangeRequestForm - 제출', () => {
  it('정상 입력으로 제출하면 submitChangeRequest를 올바른 인자로 호출하고 성공 시 onSubmitted를 호출한다', async () => {
    const user = userEvent.setup();
    const response = buildChangeRequest();
    submitChangeRequestMock.mockResolvedValue(response);
    const { container, onSubmitted } = renderForm();

    setStart('2026-04-15T09:00');
    setEnd('2026-04-15T10:00');
    await user.type(screen.getByLabelText('사유'), '회의실 변경 필요');
    fireEvent.submit(getForm(container));

    await waitFor(() => {
      expect(submitChangeRequestMock).toHaveBeenCalledWith('s1', {
        desiredStartAt: new Date(2026, 3, 15, 9, 0, 0, 0).toISOString(),
        desiredEndAt: new Date(2026, 3, 15, 10, 0, 0, 0).toISOString(),
        reason: '회의실 변경 필요',
      });
    });
    await waitFor(() => {
      expect(onSubmitted).toHaveBeenCalledWith(response);
    });
  });

  it('사유를 입력하지 않으면 reason:undefined로 전송한다', async () => {
    submitChangeRequestMock.mockResolvedValue(buildChangeRequest());
    const { container } = renderForm();

    setStart('2026-04-15T09:00');
    setEnd('2026-04-15T10:00');
    fireEvent.submit(getForm(container));

    await waitFor(() => {
      expect(submitChangeRequestMock).toHaveBeenCalledWith('s1', {
        desiredStartAt: new Date(2026, 3, 15, 9, 0, 0, 0).toISOString(),
        desiredEndAt: new Date(2026, 3, 15, 10, 0, 0, 0).toISOString(),
        reason: undefined,
      });
    });
  });

  it('submitChangeRequest가 403으로 실패하면 참여자 권한 안내 메시지를 표시하고 onSubmitted를 호출하지 않는다', async () => {
    submitChangeRequestMock.mockRejectedValue(new ApiError(403, 'NOT_PARTICIPANT', '참여자가 아닙니다'));
    const { container, onSubmitted } = renderForm();

    setStart('2026-04-15T09:00');
    setEnd('2026-04-15T10:00');
    fireEvent.submit(getForm(container));

    expect(await screen.findByText('이 일정의 참여자만 변경 요청을 제출할 수 있습니다')).toBeInTheDocument();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('submitChangeRequest가 400으로 실패하면 서버 에러 메시지를 표시한다', async () => {
    submitChangeRequestMock.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', '잘못된 요청입니다'));
    const { container } = renderForm();

    setStart('2026-04-15T09:00');
    setEnd('2026-04-15T10:00');
    fireEvent.submit(getForm(container));

    expect(await screen.findByText('잘못된 요청입니다')).toBeInTheDocument();
  });
});

describe('ChangeRequestForm - 취소', () => {
  it('취소 버튼을 클릭하면 API 호출 없이 onCancel을 호출한다', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(onCancel).toHaveBeenCalled();
    expect(submitChangeRequestMock).not.toHaveBeenCalled();
  });
});

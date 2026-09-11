import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/api-error';
import type { ChangeRequest, SubmitChangeRequestRequest } from '../../../shared/types/change-request.types';

const postMock = vi.fn();

vi.mock('../../../shared/api/http-client', () => ({
  post: (...args: unknown[]) => postMock(...args),
}));

import { submitChangeRequest, approveChangeRequest, rejectChangeRequest } from './change-request.api';

afterEach(() => {
  postMock.mockReset();
});

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

function buildRequestBody(overrides: Partial<SubmitChangeRequestRequest> = {}): SubmitChangeRequestRequest {
  return {
    desiredStartAt: '2026-04-15T09:00:00.000Z',
    desiredEndAt: '2026-04-15T10:00:00.000Z',
    reason: '회의실 변경 필요',
    ...overrides,
  };
}

describe('submitChangeRequest', () => {
  it('올바른 경로와 body로 POST /schedules/{scheduleId}/change-requests 를 호출한다', async () => {
    const response = buildChangeRequest();
    postMock.mockResolvedValue(response);
    const body = buildRequestBody();

    await submitChangeRequest('s1', body);

    expect(postMock).toHaveBeenCalledWith('/schedules/s1/change-requests', body);
  });

  it('성공하면 응답을 그대로 반환한다', async () => {
    const response = buildChangeRequest();
    postMock.mockResolvedValue(response);

    const result = await submitChangeRequest('s1', buildRequestBody());

    expect(result).toEqual(response);
  });

  it('post가 ApiError(403)로 실패하면 그대로 전파한다', async () => {
    const error = new ApiError(403, 'NOT_PARTICIPANT', '이 일정의 참여자만 변경 요청을 제출할 수 있습니다');
    postMock.mockRejectedValue(error);

    await expect(submitChangeRequest('s1', buildRequestBody())).rejects.toBe(error);
  });

  it('post가 ApiError(400)로 실패하면 그대로 전파한다', async () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', '잘못된 요청입니다');
    postMock.mockRejectedValue(error);

    await expect(submitChangeRequest('s1', buildRequestBody())).rejects.toBe(error);
  });
});

describe('approveChangeRequest', () => {
  it('올바른 경로로 POST /change-requests/{id}/approve 를 호출한다', async () => {
    const response = buildChangeRequest({ status: 'APPROVED' });
    postMock.mockResolvedValue(response);

    await approveChangeRequest('cr1');

    expect(postMock).toHaveBeenCalledWith('/change-requests/cr1/approve');
  });

  it('성공하면 APPROVED 상태인 응답을 반환한다', async () => {
    const response = buildChangeRequest({ status: 'APPROVED' });
    postMock.mockResolvedValue(response);

    const result = await approveChangeRequest('cr1');

    expect(result).toEqual(response);
  });

  it('ApiError로 실패하면 그대로 전파한다', async () => {
    const error = new ApiError(409, 'ALREADY_DECIDED', '이미 결정된 요청입니다');
    postMock.mockRejectedValue(error);

    await expect(approveChangeRequest('cr1')).rejects.toBe(error);
  });
});

describe('rejectChangeRequest', () => {
  it('올바른 경로와 body로 POST /change-requests/{id}/reject 를 호출한다', async () => {
    const response = buildChangeRequest({ status: 'REJECTED', reason: '거절 사유' });
    postMock.mockResolvedValue(response);
    const body = { reason: '거절 사유' };

    await rejectChangeRequest('cr1', body);

    expect(postMock).toHaveBeenCalledWith('/change-requests/cr1/reject', body);
  });

  it('성공하면 REJECTED 상태인 응답을 반환한다', async () => {
    const response = buildChangeRequest({ status: 'REJECTED', reason: '거절 사유' });
    postMock.mockResolvedValue(response);

    const result = await rejectChangeRequest('cr1', { reason: '거절 사유' });

    expect(result).toEqual(response);
  });

  it('ApiError로 실패하면 그대로 전파한다', async () => {
    const error = new ApiError(403, 'NOT_LEADER', '팀장만 승인/거절할 수 있습니다');
    postMock.mockRejectedValue(error);

    await expect(rejectChangeRequest('cr1', { reason: '거절 사유' })).rejects.toBe(error);
  });
});


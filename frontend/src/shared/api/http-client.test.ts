import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiRequest,
  buildAuthHeaders,
  del,
  get,
  post,
  put,
  setUnauthorizedHandler,
} from './http-client';
import { ApiError } from './api-error';
import * as tokenStorage from './token-storage';

function mockFetchResponse(init: {
  ok: boolean;
  status: number;
  statusText?: string;
  json?: unknown;
  jsonError?: boolean;
}) {
  const { ok, status, statusText = '', json, jsonError = false } = init;
  return {
    ok,
    status,
    statusText,
    json: jsonError
      ? vi.fn().mockRejectedValue(new Error('invalid json'))
      : vi.fn().mockResolvedValue(json),
  } as unknown as Response;
}

describe('buildAuthHeaders', () => {
  it('토큰이 있으면 Authorization 헤더를 반환한다', () => {
    expect(buildAuthHeaders('abc123')).toEqual({ Authorization: 'Bearer abc123' });
  });

  it('토큰이 없으면(null) 빈 객체를 반환한다', () => {
    expect(buildAuthHeaders(null)).toEqual({});
  });
});

describe('apiRequest', () => {
  beforeEach(() => {
    // 매 테스트마다 핸들러를 초기화하고 fetch를 새로 모킹한다.
    setUnauthorizedHandler(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('정상 응답(200)이면 JSON 본문을 그대로 반환한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchResponse({ ok: true, status: 200, json: { id: 1, name: 'team' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest<{ id: number; name: string }>('/teams/1');

    expect(result).toEqual({ id: 1, name: 'team' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/teams/1');
    expect((requestInit.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
  });

  it('204 응답이면 undefined를 반환한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse({ ok: true, status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest('/teams/1');

    expect(result).toBeUndefined();
  });

  it('토큰이 주어지면 Authorization 헤더를 포함해 호출한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse({ ok: true, status: 200, json: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/teams/1', { token: 'my-token' });

    const [, requestInit] = fetchMock.mock.calls[0];
    expect((requestInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer my-token',
    );
  });

  it('token 옵션 없이 호출하면 저장된 토큰을 자동으로 Authorization 헤더에 첨부한다', async () => {
    tokenStorage.setAuthToken('stored-token');
    const fetchMock = vi.fn().mockResolvedValue(mockFetchResponse({ ok: true, status: 200, json: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/teams/1');

    const [, requestInit] = fetchMock.mock.calls[0];
    expect((requestInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer stored-token',
    );
  });

  it('401 응답이면 저장된 토큰을 폐기하고 unauthorized 핸들러를 호출한다', async () => {
    const clearAuthTokenSpy = vi.spyOn(tokenStorage, 'clearAuthToken');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchResponse({
        ok: false,
        status: 401,
        json: { code: 'UNAUTHORIZED', message: '인증이 필요합니다' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/teams/1')).rejects.toThrow(ApiError);

    expect(clearAuthTokenSpy).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('에러 응답 본문이 ErrorResponse 형태이면 ApiError(code/message 포함)를 던진다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchResponse({
        ok: false,
        status: 404,
        json: { code: 'NOT_FOUND', message: '팀을 찾을 수 없습니다' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    let caught: unknown;
    try {
      await apiRequest('/teams/999');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(404);
    expect((caught as ApiError).code).toBe('NOT_FOUND');
    expect((caught as ApiError).message).toBe('팀을 찾을 수 없습니다');
  });

  it('에러 응답 본문이 ErrorResponse 형태가 아니면 기본 ApiError를 던진다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockFetchResponse({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        jsonError: true,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    let caught: unknown;
    try {
      await apiRequest('/teams/1');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(500);
  });

  it('get/post/put/del 헬퍼는 올바른 HTTP 메서드로 요청한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockFetchResponse({ ok: true, status: 200, json: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await get('/teams');
    await post('/teams', { name: 'new-team' });
    await put('/teams/1', { name: 'renamed' });
    await del('/teams/1');

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
    expect(fetchMock.mock.calls[1][1].method).toBe('POST');
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ name: 'new-team' }));
    expect(fetchMock.mock.calls[2][1].method).toBe('PUT');
    expect(fetchMock.mock.calls[2][1].body).toBe(JSON.stringify({ name: 'renamed' }));
    expect(fetchMock.mock.calls[3][1].method).toBe('DELETE');
  });
});

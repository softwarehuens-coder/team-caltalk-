import { ApiError, isErrorResponse } from './api-error';
import { clearAuthToken, getAuthToken } from './token-storage';

// 끝에 '/'가 붙은 값(VITE_API_BASE_URL 설정 실수)이 경로와 합쳐질 때 '//auth/register'
// 같은 이중 슬래시가 되는 것을 막는다 — 이중 슬래시는 Vercel에서 정규 경로로 리다이렉트되고,
// 브라우저는 CORS preflight에 대한 리다이렉트를 허용하지 않아 요청 자체가 막힌다.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

export function buildAuthHeaders(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string | null;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;
  const resolvedToken = token !== undefined ? token : getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(resolvedToken),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401) {
    clearAuthToken();
    unauthorizedHandler?.();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (isErrorResponse(data)) {
      throw new ApiError(response.status, data.code, data.message);
    }
    throw new ApiError(response.status, 'UNKNOWN_ERROR', response.statusText);
  }

  return data as T;
}

export function get<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'GET' });
}

export function post<T>(path: string, body?: unknown, options: ApiRequestOptions = {}): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'POST', body });
}

export function put<T>(path: string, body?: unknown, options: ApiRequestOptions = {}): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'PUT', body });
}

export function del<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'DELETE' });
}

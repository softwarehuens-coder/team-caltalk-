import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';
import { ApiError } from '../../shared/api/api-error';
import type { LoginResponse } from '../../shared/types/auth.types';

vi.mock('../../shared/api/token-storage', () => ({
  getAuthToken: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
}));

vi.mock('../../shared/api/http-client', () => ({
  setUnauthorizedHandler: vi.fn(),
}));

vi.mock('../../features/auth/api/auth.api', () => ({
  loginUser: vi.fn(),
}));

import * as tokenStorage from '../../shared/api/token-storage';
import * as httpClient from '../../shared/api/http-client';
import * as authApi from '../../features/auth/api/auth.api';
import { AuthProvider } from './AuthProvider';
import { AuthContext } from './auth-context';

function TestConsumer() {
  const ctx = useContext(AuthContext);
  if (!ctx) return null;
  return (
    <div>
      <span data-testid="status">{ctx.status}</span>
      <span data-testid="user-email">{ctx.user?.email ?? ''}</span>
      <button
        onClick={() => {
          ctx.login({ email: 'user@test.com', password: 'password123' }).catch(() => {});
        }}
      >
        login
      </button>
      <button onClick={() => ctx.logout()}>logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.mocked(tokenStorage.getAuthToken).mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('저장된 토큰이 없으면 초기 status가 unauthenticated이다', () => {
    vi.mocked(tokenStorage.getAuthToken).mockReturnValue(null);

    renderProvider();

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('저장된 토큰이 있으면 초기 status가 authenticated이다', () => {
    vi.mocked(tokenStorage.getAuthToken).mockReturnValue('stored-token');

    renderProvider();

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });

  it('login 성공 시 토큰을 저장하고 status를 authenticated로 전환한다', async () => {
    const user = userEvent.setup();
    const response: LoginResponse = {
      token: 'new-token',
      user: { id: 'u1', email: 'user@test.com', name: '홍길동', createdAt: '2026-01-01T00:00:00.000Z' },
    };
    vi.mocked(authApi.loginUser).mockResolvedValue(response);

    renderProvider();
    await user.click(screen.getByText('login'));

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });
    expect(tokenStorage.setAuthToken).toHaveBeenCalledWith('new-token');
    expect(screen.getByTestId('user-email')).toHaveTextContent('user@test.com');
  });

  it('login 실패 시 에러를 전파하고 status는 unauthenticated로 유지된다', async () => {
    const user = userEvent.setup();
    const error = new ApiError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다');
    vi.mocked(authApi.loginUser).mockRejectedValue(error);

    renderProvider();
    await user.click(screen.getByText('login'));

    await waitFor(() => {
      expect(authApi.loginUser).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('logout 호출 시 토큰을 삭제하고 status를 unauthenticated로 전환한다', async () => {
    const user = userEvent.setup();
    vi.mocked(tokenStorage.getAuthToken).mockReturnValue('stored-token');

    renderProvider();
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');

    await user.click(screen.getByText('logout'));

    expect(tokenStorage.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('마운트 시 401 unauthorized 핸들러를 등록하고, 호출되면 status가 unauthenticated로 전환된다', () => {
    vi.mocked(tokenStorage.getAuthToken).mockReturnValue('stored-token');

    renderProvider();

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(httpClient.setUnauthorizedHandler).toHaveBeenCalledTimes(1);

    const registeredHandler = vi.mocked(httpClient.setUnauthorizedHandler).mock.calls[0][0];
    act(() => {
      registeredHandler();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });
});

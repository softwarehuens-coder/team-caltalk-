import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/api-error';
import type { LoginRequest, LoginResponse, RegisterRequest } from '../../../shared/types/auth.types';

const postMock = vi.fn();

vi.mock('../../../shared/api/http-client', () => ({
  post: (...args: unknown[]) => postMock(...args),
}));

import { loginUser, registerUser } from './auth.api';

describe('registerUser', () => {
  afterEach(() => {
    postMock.mockReset();
  });

  it('POST /auth/register 를 올바른 payload로 호출하고 생성된 사용자를 반환한다', async () => {
    const payload: RegisterRequest = { email: 'user@test.com', name: '홍길동', password: 'password123' };
    const createdUser = {
      id: 'u1',
      email: payload.email,
      name: payload.name,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    postMock.mockResolvedValue(createdUser);

    const result = await registerUser(payload);

    expect(postMock).toHaveBeenCalledWith('/auth/register', payload);
    expect(result).toEqual(createdUser);
  });

  it('post가 ApiError로 실패하면(409 중복 이메일) 그대로 전파한다', async () => {
    const payload: RegisterRequest = { email: 'dup@test.com', name: '중복', password: 'password123' };
    const error = new ApiError(409, 'DUPLICATE_EMAIL', '이미 사용 중인 이메일입니다');
    postMock.mockRejectedValue(error);

    await expect(registerUser(payload)).rejects.toBe(error);
  });
});

describe('loginUser', () => {
  afterEach(() => {
    postMock.mockReset();
  });

  it('POST /auth/login 을 올바른 payload로 호출하고 { token, user }를 반환한다', async () => {
    const payload: LoginRequest = { email: 'user@test.com', password: 'password123' };
    const response: LoginResponse = {
      token: 'jwt-token',
      user: { id: 'u1', email: payload.email, name: '홍길동', createdAt: '2026-01-01T00:00:00.000Z' },
    };
    postMock.mockResolvedValue(response);

    const result = await loginUser(payload);

    expect(postMock).toHaveBeenCalledWith('/auth/login', payload);
    expect(result).toEqual(response);
  });

  it('post가 ApiError로 실패하면(401 인증 실패) 그대로 전파한다', async () => {
    const payload: LoginRequest = { email: 'user@test.com', password: 'wrong-password' };
    const error = new ApiError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다');
    postMock.mockRejectedValue(error);

    await expect(loginUser(payload)).rejects.toBe(error);
  });
});

import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { createAuthMiddleware } from '../../../src/presentation/http/middlewares/auth.middleware';
import { issueToken } from '../../../src/infrastructure/auth/jwt-token.service';

const JWT_SECRET = 'test-secret';

function fakeRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('auth.middleware', () => {
  const authenticate = createAuthMiddleware(JWT_SECRET);

  it('Authorization 헤더가 없으면 401을 반환하고 next를 호출하지 않는다', () => {
    const req = { headers: {} } as Request;
    const res = fakeRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('유효하지 않은 토큰이면 401을 반환하고 next를 호출하지 않는다', () => {
    const req = { headers: { authorization: 'Bearer invalid-token' } } as Request;
    const res = fakeRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('유효한 토큰이면 req.user를 채우고 next를 호출한다', () => {
    const token = issueToken({ userId: 'user-1', email: 'a@example.com' }, JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = fakeRes();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ userId: 'user-1', email: 'a@example.com' });
    expect(res.status).not.toHaveBeenCalled();
  });
});

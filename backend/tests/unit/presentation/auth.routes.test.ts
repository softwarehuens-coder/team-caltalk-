import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuthRouter } from '../../../src/presentation/http/routes/auth.routes';
import { EmailAlreadyExistsError } from '../../../src/domain/auth/auth-errors';
import { hashPassword } from '../../../src/domain/auth/password';
import type { UserRepository } from '../../../src/domain/user/user.repository';

const JWT_SECRET = 'test-secret';

function buildApp(userRepository: UserRepository) {
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter(userRepository, JWT_SECRET));
  return app;
}

describe('POST /auth/register', () => {
  it('성공 시 201 + password_hash가 없는 User를 반환한다', async () => {
    const userRepository: UserRepository = {
      findByEmail: vi.fn(),
      create: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        name: '홍길동',
        passwordHash: 'hashed',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    };

    const res = await request(buildApp(userRepository))
      .post('/auth/register')
      .send({ email: 'a@example.com', name: '홍길동', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('password_hash');
    expect(res.body).toMatchObject({ id: 'user-1', email: 'a@example.com', name: '홍길동' });
  });

  it('이메일이 중복이면 409를 반환한다', async () => {
    const userRepository: UserRepository = {
      findByEmail: vi.fn(),
      create: vi.fn().mockRejectedValue(new EmailAlreadyExistsError('dup@example.com')),
    };

    const res = await request(buildApp(userRepository))
      .post('/auth/register')
      .send({ email: 'dup@example.com', name: '홍길동', password: 'password123' });

    expect(res.status).toBe(409);
  });
});

describe('POST /auth/login', () => {
  it('성공 시 200 + {token, user}를 반환한다', async () => {
    const passwordHash = await hashPassword('correct-password');
    const userRepository: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        name: '홍길동',
        passwordHash,
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
      create: vi.fn(),
    };

    const res = await request(buildApp(userRepository))
      .post('/auth/login')
      .send({ email: 'a@example.com', password: 'correct-password' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ id: 'user-1', email: 'a@example.com' });
  });

  it('비밀번호가 틀리면 401을 반환한다', async () => {
    const passwordHash = await hashPassword('correct-password');
    const userRepository: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@example.com',
        name: '홍길동',
        passwordHash,
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
      create: vi.fn(),
    };

    const res = await request(buildApp(userRepository))
      .post('/auth/login')
      .send({ email: 'a@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });
});

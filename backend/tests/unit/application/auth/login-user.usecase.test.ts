import { describe, it, expect, vi } from 'vitest';
import { loginUser } from '../../../../src/application/auth/login-user.usecase';
import { InvalidCredentialsError } from '../../../../src/domain/auth/auth-errors';
import { hashPassword } from '../../../../src/domain/auth/password';
import type { UserRepository } from '../../../../src/domain/user/user.repository';

const JWT_SECRET = 'test-secret';

describe('loginUser', () => {
  it('존재하지 않는 이메일이면 InvalidCredentialsError를 던진다', async () => {
    const userRepository: UserRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    };

    await expect(
      loginUser(userRepository, JWT_SECRET, { email: 'nobody@example.com', password: 'x' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('비밀번호가 틀리면 InvalidCredentialsError를 던진다', async () => {
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

    await expect(
      loginUser(userRepository, JWT_SECRET, { email: 'a@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('이메일/비밀번호가 맞으면 토큰과 password_hash 없는 user를 반환한다', async () => {
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

    const result = await loginUser(userRepository, JWT_SECRET, {
      email: 'a@example.com',
      password: 'correct-password',
    });

    expect(typeof result.token).toBe('string');
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'a@example.com',
      name: '홍길동',
      createdAt: '2026-09-09T00:00:00.000Z',
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });
});

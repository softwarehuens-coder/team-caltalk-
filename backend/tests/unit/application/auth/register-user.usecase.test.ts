import { describe, it, expect, vi } from 'vitest';
import { registerUser } from '../../../../src/application/auth/register-user.usecase';
import { EmailAlreadyExistsError } from '../../../../src/domain/auth/auth-errors';
import type { UserRepository } from '../../../../src/domain/user/user.repository';

describe('registerUser', () => {
  it('신규 이메일이면 password_hash가 제외된 User를 반환한다', async () => {
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

    const user = await registerUser(userRepository, {
      email: 'a@example.com',
      name: '홍길동',
      password: 'password123',
    });

    expect(user).toEqual({
      id: 'user-1',
      email: 'a@example.com',
      name: '홍길동',
      createdAt: '2026-09-09T00:00:00.000Z',
    });
    expect(user).not.toHaveProperty('passwordHash');
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@example.com', name: '홍길동' }),
    );
  });

  it('이미 등록된 이메일이면 EmailAlreadyExistsError를 그대로 전파한다', async () => {
    const userRepository: UserRepository = {
      findByEmail: vi.fn(),
      create: vi.fn().mockRejectedValue(new EmailAlreadyExistsError('dup@example.com')),
    };

    await expect(
      registerUser(userRepository, {
        email: 'dup@example.com',
        name: '홍길동',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
  });
});

import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../../../src/domain/auth/password';

describe('password 해시/검증', () => {
  it('평문 비밀번호를 해시로 변환하고, 해시는 평문과 다르다', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(hash).not.toBe('correct-horse-battery-staple');
  });

  it('올바른 비밀번호는 해시 검증을 통과한다', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(verifyPassword('correct-horse-battery-staple', hash)).resolves.toBe(true);
  });

  it('틀린 비밀번호는 해시 검증을 통과하지 못한다', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });
});

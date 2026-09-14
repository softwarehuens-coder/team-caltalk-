import { describe, it, expect } from 'vitest';
import { verifySocketToken } from '../../../../src/presentation/websocket/ws-auth.guard';
import { issueToken } from '../../../../src/infrastructure/auth/jwt-token.service';

const JWT_SECRET = 'test-secret';

describe('verifySocketToken', () => {
  it('유효한 토큰이면 payload를 반환한다', () => {
    const token = issueToken({ userId: 'user-1', email: 'a@example.com' }, JWT_SECRET);
    expect(verifySocketToken(token, JWT_SECRET)).toMatchObject({
      userId: 'user-1',
      email: 'a@example.com',
    });
  });

  it('유효하지 않은 토큰이면 null을 반환한다(예외를 던지지 않음)', () => {
    expect(verifySocketToken('invalid-token', JWT_SECRET)).toBeNull();
  });

  it('다른 시크릿으로 서명된 토큰은 null을 반환한다', () => {
    const token = issueToken({ userId: 'user-1', email: 'a@example.com' }, 'other-secret');
    expect(verifySocketToken(token, JWT_SECRET)).toBeNull();
  });
});

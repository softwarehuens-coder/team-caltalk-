import jwt from 'jsonwebtoken';

// 토큰 형식(JWT)은 6-tech-stack.md 6장에서 세부 기술 설계로 미룬 항목 중
// 이번 태스크(BE-2)에서 내린 구체적 구현 선택이다. schema.sql에 별도
// 세션 테이블이 없어 무상태(stateless) 토큰이 자연스럽다.

const TOKEN_TTL = '24h';

export interface TokenPayload {
  userId: string;
  email: string;
}

export function issueToken(payload: TokenPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string, secret: string): TokenPayload {
  const decoded = jwt.verify(token, secret);
  return decoded as unknown as TokenPayload;
}

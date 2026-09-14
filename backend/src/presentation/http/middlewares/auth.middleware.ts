import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../../../infrastructure/auth/jwt-token.service';

// UC1 인증 강제 지점(docs/4-project-structure.md 5.2절) — 라우트 미들웨어 단계에서
// 인증 여부를 검사하며, 미검증 요청은 애플리케이션 계층에 도달하지 못하고 여기서 401로 차단된다.

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function createAuthMiddleware(jwtSecret: string) {
  return function authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' });
      return;
    }

    const token = authHeader.slice('Bearer '.length);
    try {
      const payload = verifyToken(token, jwtSecret);
      req.user = { userId: payload.userId, email: payload.email };
      next();
    } catch {
      res.status(401).json({ code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' });
    }
  };
}

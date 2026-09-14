import type { Response } from 'express';
import { NotFoundError, ForbiddenError, ConflictError } from '../../domain/shared/http-errors';

// 여러 라우트가 반복하는 도메인 오류 → HTTP 상태 매핑을 한 곳에 모은다.
// 처리하지 못한 오류는 false를 반환하며, 호출부가 그대로 다시 throw해 Express 기본
// 오류 처리(500)로 흘려보낸다.
export function respondToDomainError(error: unknown, res: Response): boolean {
  if (error instanceof NotFoundError) {
    res.status(404).json({ code: error.code, message: error.message });
    return true;
  }
  if (error instanceof ForbiddenError) {
    res.status(403).json({ code: error.code, message: error.message });
    return true;
  }
  if (error instanceof ConflictError) {
    res.status(409).json({ code: error.code, message: error.message });
    return true;
  }
  return false;
}

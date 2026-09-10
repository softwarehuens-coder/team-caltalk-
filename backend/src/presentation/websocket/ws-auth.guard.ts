import { verifyToken, type TokenPayload } from '../../infrastructure/auth/jwt-token.service';

// 소켓 핸드셰이크 인증 검사(docs/4-project-structure.md 5.2절). chat.gateway.ts가
// 연결 시점과 메시지 수신 시점 모두에 이 함수를 호출해 세션 유효성을 재확인한다.
// jwt.verify는 만료(exp)도 함께 검증하므로, 핸드셰이크 이후 토큰이 만료된 경우
// 메시지 단위 재검증에서 자연스럽게 거부된다.
export function verifySocketToken(token: string, jwtSecret: string): TokenPayload | null {
  try {
    return verifyToken(token, jwtSecret);
  } catch {
    return null;
  }
}

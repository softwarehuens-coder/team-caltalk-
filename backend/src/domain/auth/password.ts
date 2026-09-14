import bcrypt from 'bcryptjs';

// UC1 인증 — 비밀번호는 해시로만 저장한다(docs/4-project-structure.md 5.2/5.3절).
// 외부 라이브러리(bcryptjs)를 감싸 순수 함수 형태로 노출해 단위 테스트가
// DB/네트워크 없이 실행되도록 한다(4.1절 테스트 피라미드).

const SALT_ROUNDS = 10;

export function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

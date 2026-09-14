import type { UserRepository } from '../../domain/user/user.repository';
import type { User } from '../../domain/user/user.entity';
import { verifyPassword } from '../../domain/auth/password';
import { InvalidCredentialsError } from '../../domain/auth/auth-errors';
import { issueToken } from '../../infrastructure/auth/jwt-token.service';

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: User;
}

// UC1 로그인. 이메일 미존재/비밀번호 불일치를 동일한 InvalidCredentialsError로
// 다뤄, 프레젠테이션 계층이 어느 쪽인지 노출하지 않고 401로 매핑하게 한다.
export async function loginUser(
  userRepository: UserRepository,
  jwtSecret: string,
  input: LoginUserInput,
): Promise<LoginResult> {
  const record = await userRepository.findByEmail(input.email);
  if (!record) {
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await verifyPassword(input.password, record.passwordHash);
  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  const token = issueToken({ userId: record.id, email: record.email }, jwtSecret);
  const user: User = {
    id: record.id,
    email: record.email,
    name: record.name,
    createdAt: record.createdAt,
  };

  return { token, user };
}

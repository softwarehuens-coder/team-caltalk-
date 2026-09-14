import type { UserRepository } from '../../domain/user/user.repository';
import type { User } from '../../domain/user/user.entity';
import { hashPassword } from '../../domain/auth/password';

export interface RegisterUserInput {
  email: string;
  name: string;
  password: string;
}

// UC1 회원가입. 이메일 중복은 리포지토리가 EmailAlreadyExistsError로 던지며,
// 이 유스케이스는 그대로 전파해 프레젠테이션 계층이 409로 매핑하게 한다.
export async function registerUser(
  userRepository: UserRepository,
  input: RegisterUserInput,
): Promise<User> {
  const passwordHash = await hashPassword(input.password);

  const record = await userRepository.create({
    email: input.email,
    name: input.name,
    passwordHash,
  });

  return { id: record.id, email: record.email, name: record.name, createdAt: record.createdAt };
}

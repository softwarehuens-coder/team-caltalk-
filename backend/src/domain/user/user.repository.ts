import type { UserRecord } from './user.entity';

// 인터페이스만 정의(docs/4-project-structure.md 2.2절) — 구현은 infrastructure에 위치.
export interface CreateUserInput {
  email: string;
  name: string;
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
}

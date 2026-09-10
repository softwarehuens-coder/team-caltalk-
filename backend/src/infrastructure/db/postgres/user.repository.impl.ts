import type { Pool } from 'pg';
import type { CreateUserInput, UserRepository } from '../../../domain/user/user.repository';
import type { UserRecord } from '../../../domain/user/user.entity';
import { EmailAlreadyExistsError } from '../../../domain/auth/auth-errors';

const POSTGRES_UNIQUE_VIOLATION = '23505';

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
}

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    createdAt: row.created_at.toISOString(),
  };
}

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRow>(
      'SELECT id, email, name, password_hash, created_at FROM users WHERE email = $1',
      [email],
    );
    return result.rows[0] ? toUserRecord(result.rows[0]) : null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    try {
      const result = await this.pool.query<UserRow>(
        `INSERT INTO users (email, name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, password_hash, created_at`,
        [input.email, input.name, input.passwordHash],
      );
      return toUserRecord(result.rows[0]);
    } catch (error) {
      // uq_users_email 위반을 명시적으로 409로 매핑하기 위한 도메인 오류로 변환한다
      // (schema.sql 제약 위반을 500으로 흘려보내지 않는다 — 이슈 #31 BE-2 기술적 고려사항).
      if (isUniqueViolation(error)) {
        throw new EmailAlreadyExistsError(input.email);
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
  );
}

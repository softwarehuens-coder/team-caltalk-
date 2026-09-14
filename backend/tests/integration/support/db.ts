import 'dotenv/config';
import { Pool } from 'pg';

// 통합 테스트 전용 커넥션. 로컬 개발 환경(backend/.env)이나 CI(backend-ci.yml의
// Postgres 서비스 컨테이너)가 제공하는 POSTGRES_CONNECTION_STRING을 그대로 사용한다.
export const testPool = new Pool({ connectionString: process.env.POSTGRES_CONNECTION_STRING });

export async function createTestUser(email: string, name: string): Promise<string> {
  const result = await testPool.query<{ id: string }>(
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, 'test-hash') RETURNING id`,
    [email, name],
  );
  return result.rows[0].id;
}

export async function deleteTestUser(userId: string): Promise<void> {
  await testPool.query('DELETE FROM users WHERE id = $1', [userId]);
}

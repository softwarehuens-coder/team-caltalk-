import type { Pool, PoolClient } from 'pg';

// 여러 리포지토리(team/schedule/change-request)가 공통으로 필요로 하는 트랜잭션
// 보일러플레이트(BEGIN/COMMIT/ROLLBACK)를 한 곳에 모은다. SC3(변경요청 승인)과
// "팀당 정확히 1명의 팀장" 불변조건처럼 여러 UPDATE/INSERT를 원자적으로 묶어야
// 하는 지점에서 재사용한다(CLAUDE.md 도메인 불변조건).
export async function withTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

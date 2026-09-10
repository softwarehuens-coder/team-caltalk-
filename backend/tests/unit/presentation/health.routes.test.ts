import { describe, it, expect } from 'vitest';
import request from 'supertest';
import type { Pool } from 'pg';
import { createApp } from '../../../src/app';

function fakePool(queryImpl: () => Promise<unknown>): Pool {
  return { query: queryImpl } as unknown as Pool;
}

describe('GET /health', () => {
  it('DB 연결이 정상이면 200 + {status: ok, database: connected}를 반환한다', async () => {
    const app = createApp(
      fakePool(() => Promise.resolve()),
      'test-secret',
    );

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'connected' });
  });

  it('DB 연결에 실패해도 200을 반환하되 database 필드로 상태를 알린다', async () => {
    const app = createApp(
      fakePool(() => Promise.reject(new Error('connection refused'))),
      'test-secret',
    );

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'disconnected' });
  });
});

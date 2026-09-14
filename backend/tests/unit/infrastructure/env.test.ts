import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadEnv } from '../../../src/infrastructure/config/env';

describe('loadEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.POSTGRES_CONNECTION_STRING;
    delete process.env.PORT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('필수 환경변수(POSTGRES_CONNECTION_STRING)가 없으면 기동을 실패시킨다', () => {
    expect(() => loadEnv()).toThrow('POSTGRES_CONNECTION_STRING');
  });

  it('필수 환경변수가 있으면 설정을 반환하고, PORT 미설정 시 기본값 3001을 사용한다', () => {
    process.env.POSTGRES_CONNECTION_STRING = 'postgresql://localhost:5432/test';

    const env = loadEnv();

    expect(env.postgresConnectionString).toBe('postgresql://localhost:5432/test');
    expect(env.port).toBe(3001);
  });
});

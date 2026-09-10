import { Pool } from 'pg';
import type { EnvConfig } from '../../config/env';

export function createPool(env: EnvConfig): Pool {
  return new Pool({ connectionString: env.postgresConnectionString });
}

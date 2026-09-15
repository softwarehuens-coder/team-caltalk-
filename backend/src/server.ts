import { loadEnv } from './infrastructure/config/env';
import { createPool } from './infrastructure/db/postgres/pool';
import { createApp } from './app';
import { logger } from './infrastructure/logging/logger';

const env = loadEnv();
const pool = createPool(env);
const app = createApp(pool, env.jwtSecret, env.corsOrigin);

app.listen(env.port, () => {
  logger.info('Team CalTalk backend started', { port: env.port });
});

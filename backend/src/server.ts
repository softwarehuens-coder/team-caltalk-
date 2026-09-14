import { loadEnv } from './infrastructure/config/env';
import { createPool } from './infrastructure/db/postgres/pool';
import { createRepositories } from './infrastructure/repositories';
import { createApp } from './app';
import { createChatGateway } from './presentation/websocket/chat.gateway';
import { logger } from './infrastructure/logging/logger';

const env = loadEnv();
const pool = createPool(env);
const app = createApp(pool, env.jwtSecret);

const httpServer = app.listen(env.port, () => {
  logger.info('Team CalTalk backend started', { port: env.port });
});

// REST(위 app)와 동일한 리포지토리 구성을 공유해 WS로 저장된 메시지가 BE-6 REST
// 조회로도 동일하게 나타나게 한다(docs/4-project-structure.md 6.2절).
const { scheduleRepository, teamRepository, chatRepository } = createRepositories(pool);
createChatGateway(
  httpServer,
  { scheduleRepository, teamRepository, chatRepository },
  env.jwtSecret,
);

import express, { type Express } from 'express';
import type { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import swaggerUi from 'swagger-ui-express';
import { createHealthRouter } from './presentation/http/routes/health.routes';
import { createAuthRouter } from './presentation/http/routes/auth.routes';
import { createTeamRouter } from './presentation/http/routes/team.routes';
import { createScheduleRouter } from './presentation/http/routes/schedule.routes';
import { createChatRouter } from './presentation/http/routes/chat.routes';
import { createChangeRequestRouter } from './presentation/http/routes/change-request.routes';
import { createAuthMiddleware } from './presentation/http/middlewares/auth.middleware';
import { createRepositories } from './infrastructure/repositories';

export function createApp(pool: Pool, jwtSecret: string): Express {
  const app = express();
  app.use(express.json());

  const {
    userRepository,
    teamRepository,
    scheduleRepository,
    chatRepository,
    changeRequestRepository,
  } = createRepositories(pool);

  // 인증이 필요 없는 엔드포인트(swagger.json bearerAuth 설명 참조).
  app.use(createHealthRouter(pool));
  app.use(createAuthRouter(userRepository, jwtSecret));

  // API 계약 SSOT(swagger/swagger.json, docs/CLAUDE.md 참조)를 실제 서버에서도
  // 그대로 확인할 수 있도록 Swagger UI를 노출한다(mockup/server.js와 동일한 스펙 사용).
  const swaggerDocument = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../swagger/swagger.json'), 'utf-8'),
  );
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // 이 지점 이후에 마운트되는 라우트는 모두 인증이 필요하다(docs/4-project-structure.md 5.2절).
  app.use(createAuthMiddleware(jwtSecret));

  app.use(createTeamRouter(teamRepository));
  app.use(createScheduleRouter(teamRepository, scheduleRepository));
  app.use(createChatRouter(scheduleRepository, teamRepository, chatRepository));
  app.use(
    createChangeRequestRouter(
      teamRepository,
      scheduleRepository,
      changeRequestRepository,
      chatRepository,
    ),
  );

  return app;
}

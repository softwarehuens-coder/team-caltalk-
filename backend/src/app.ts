import express, { type Express } from 'express';
import cors from 'cors';
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

export function createApp(pool: Pool, jwtSecret: string, corsOrigin?: string): Express {
  const app = express();

  // 프론트엔드(Vercel)와 백엔드(Vercel)가 서로 다른 도메인에 배포되므로 CORS 허용이 필요하다.
  // CORS_ORIGIN 미설정 시(로컬 개발 등, vite.config.ts 프록시로 우회) CORS 미들웨어를 붙이지 않는다.
  if (corsOrigin) {
    app.use(cors({ origin: corsOrigin.split(',').map((origin) => origin.trim()) }));
  }

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
  // process.cwd() 기준 경로를 쓴다 — 로컬(tsx)/Railway(node dist/server.js)/Vercel
  // 서버리스 함수 모두 프로세스 시작 시 작업 디렉터리가 backend/이므로, 빌드 산출물이
  // dist/에 있는지 번들된 함수 내부에 있는지(__dirname 깊이)와 무관하게 동일하게 동작한다.
  const swaggerDocument = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'swagger', 'swagger.json'), 'utf-8'),
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

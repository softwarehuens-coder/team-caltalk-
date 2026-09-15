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
  // __dirname 기준 경로를 쓴다 — 로컬(tsx, src/app.ts)/Railway(node dist/server.js,
  // dist/app.js)/Vercel 서버리스 함수(backend/src/app.js, 디렉터리 구조가 보존됨) 모두
  // 이 파일은 backend/ 바로 아래 한 단계(src/ 또는 dist/)에 위치하므로 '..'로 backend/까지
  // 한 번만 올라가면 동일하게 backend/swagger/swagger.json에 닿는다. 리터럴 경로라
  // Vercel의 정적 분석(NFT)이 자동으로 번들에 포함시켜준다(process.cwd()는 Vercel에서
  // 저장소 루트를 가리켜 backend/ 한 단계가 빠지는 문제가 있었다).
  const swaggerDocument = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'swagger', 'swagger.json'), 'utf-8'),
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

import type { IncomingMessage, ServerResponse } from 'http';
import { loadEnv } from '../src/infrastructure/config/env';
import { createPool } from '../src/infrastructure/db/postgres/pool';
import { createApp } from '../src/app';

// Vercel 서버리스 함수 진입점. REST API(app.ts)만 노출한다 — chat.gateway.ts의
// WebSocket 실시간 채팅(UC5)은 상시 연결이 필요해 서버리스 함수 모델과 맞지
// 않으므로 여기서는 의도적으로 연결하지 않는다. 콜드 스타트 시 1회 생성된 pool/app을
// 모듈 스코프에 두어 이후 웜 invocation에서 재사용한다.
const env = loadEnv();
const pool = createPool(env);
const app = createApp(pool, env.jwtSecret, env.corsOrigin);

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  app(req, res);
}

import { Router } from 'express';
import type { Pool } from 'pg';

// swagger/swagger.json의 GET /health, HealthStatus 스키마 계약을 그대로 따른다.
export interface HealthStatus {
  status: string;
  database: string;
}

export function createHealthRouter(pool: Pool): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    let database = 'connected';
    try {
      await pool.query('SELECT 1');
    } catch {
      database = 'disconnected';
    }

    const body: HealthStatus = { status: 'ok', database };
    res.status(200).json(body);
  });

  return router;
}

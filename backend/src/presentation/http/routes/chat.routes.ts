import { Router } from 'express';
import type { ScheduleRepository } from '../../../domain/schedule/schedule.repository';
import type { TeamRepository } from '../../../domain/team/team.repository';
import type { ChatRepository } from '../../../domain/chat/chat.repository';
import { listChatHistory } from '../../../application/chat/list-chat-history.usecase';
import { respondToDomainError } from '../error-mapper';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// swagger/swagger.json GET /schedules/{scheduleId}/messages(UC8, REST 전용) 계약을
// 그대로 구현한다. 실시간 송수신(UC5)은 BE-8의 chat.gateway.ts가 담당하며 이
// 라우터에는 포함하지 않는다(docs/4-project-structure.md 5.4/6.2절).
export function createChatRouter(
  scheduleRepository: ScheduleRepository,
  teamRepository: TeamRepository,
  chatRepository: ChatRepository,
): Router {
  const router = Router();

  router.get('/schedules/:scheduleId/messages', async (req, res) => {
    const { cursor } = req.query;
    const rawLimit = req.query.limit;

    if (cursor !== undefined && typeof cursor !== 'string') {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    let limit = DEFAULT_LIMIT;
    if (rawLimit !== undefined) {
      const parsed = Number(rawLimit);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
        res
          .status(400)
          .json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
        return;
      }
      limit = parsed;
    }

    try {
      const result = await listChatHistory(scheduleRepository, teamRepository, chatRepository, {
        scheduleId: req.params.scheduleId,
        actorUserId: req.user!.userId,
        cursor: typeof cursor === 'string' ? cursor : null,
        limit,
      });
      res.status(200).json(result);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  return router;
}

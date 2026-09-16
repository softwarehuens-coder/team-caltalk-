import { Router } from 'express';
import type { ScheduleRepository } from '../../../domain/schedule/schedule.repository';
import type { TeamRepository } from '../../../domain/team/team.repository';
import type { ChatRepository } from '../../../domain/chat/chat.repository';
import { listChatHistory } from '../../../application/chat/list-chat-history.usecase';
import { pollChatMessages } from '../../../application/chat/poll-chat-messages.usecase';
import { sendChatMessage } from '../../../application/chat/send-chat-message.usecase';
import { respondToDomainError } from '../error-mapper';
import { isUuid } from '../validation';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_POLL_TIMEOUT_MS = 25000;
const MAX_POLL_TIMEOUT_MS = 25000;

// swagger/swagger.json GET/POST /schedules/{scheduleId}/messages, GET
// /schedules/{scheduleId}/messages/poll 계약을 그대로 구현한다. 실시간 송수신(UC5)은
// WebSocket 대신 이 라우터의 롱폴링(poll)/전송(POST) 엔드포인트로 구현한다(과거
// chat.gateway.ts는 제거됨 — Vercel 서버리스 배포와 상시 연결 WebSocket이 맞지
// 않아 REST 롱폴링으로 전환했다).
export function createChatRouter(
  scheduleRepository: ScheduleRepository,
  teamRepository: TeamRepository,
  chatRepository: ChatRepository,
): Router {
  const router = Router();

  router.get('/schedules/:scheduleId/messages', async (req, res) => {
    const { cursor } = req.query;
    const rawLimit = req.query.limit;

    if (!isUuid(req.params.scheduleId) || (cursor !== undefined && typeof cursor !== 'string')) {
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

  // UC5(실시간 수신) 롱폴링 엔드포인트. cursor 이후 새 메시지가 생길 때까지 최대
  // timeout(ms) 동안 서버에서 대기하다 응답한다 — 클라이언트는 응답을 받는 즉시
  // 반환된 데이터의 마지막 createdAt을 다음 cursor로 삼아 다시 요청한다.
  router.get('/schedules/:scheduleId/messages/poll', async (req, res) => {
    const { cursor } = req.query;
    const rawTimeout = req.query.timeout;

    if (!isUuid(req.params.scheduleId) || (cursor !== undefined && typeof cursor !== 'string')) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    let timeoutMs = DEFAULT_POLL_TIMEOUT_MS;
    if (rawTimeout !== undefined) {
      const parsed = Number(rawTimeout);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_POLL_TIMEOUT_MS) {
        res
          .status(400)
          .json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
        return;
      }
      timeoutMs = parsed;
    }

    try {
      const result = await pollChatMessages(scheduleRepository, teamRepository, chatRepository, {
        scheduleId: req.params.scheduleId,
        actorUserId: req.user!.userId,
        cursor: typeof cursor === 'string' ? cursor : null,
        limit: DEFAULT_LIMIT,
        timeoutMs,
      });
      res.status(200).json(result);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  // UC5(실시간 송신). 저장 후 발신자 자신에게도 생성된 메시지를 그대로 돌려줘,
  // 자신이 보낸 메시지를 다음 poll 응답을 기다리지 않고 즉시 화면에 반영할 수 있게 한다.
  router.post('/schedules/:scheduleId/messages', async (req, res) => {
    const { content } = req.body as { content?: unknown };
    if (!isUuid(req.params.scheduleId) || typeof content !== 'string') {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      const message = await sendChatMessage(scheduleRepository, teamRepository, chatRepository, {
        scheduleId: req.params.scheduleId,
        actorUserId: req.user!.userId,
        content,
      });
      res.status(201).json(message);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  return router;
}

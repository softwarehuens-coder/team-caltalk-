import { Router } from 'express';
import type { TeamRepository } from '../../../domain/team/team.repository';
import type { ScheduleRepository } from '../../../domain/schedule/schedule.repository';
import type { ChangeRequestRepository } from '../../../domain/change-request/change-request.repository';
import type { ChatRepository } from '../../../domain/chat/chat.repository';
import { submitChangeRequest } from '../../../application/change-request/submit-change-request.usecase';
import { approveChangeRequest } from '../../../application/change-request/approve-change-request.usecase';
import { rejectChangeRequest } from '../../../application/change-request/reject-change-request.usecase';
import { listChangeRequests } from '../../../application/change-request/list-change-requests.usecase';
import { respondToDomainError } from '../error-mapper';
import { isUuid } from '../validation';

// swagger/swagger.json의 변경요청 엔드포인트(UC6/UC7, SC3) 계약을 그대로 구현한다.
export function createChangeRequestRouter(
  teamRepository: TeamRepository,
  scheduleRepository: ScheduleRepository,
  changeRequestRepository: ChangeRequestRepository,
  chatRepository: ChatRepository,
): Router {
  const router = Router();

  router.post('/schedules/:scheduleId/change-requests', async (req, res) => {
    const { desiredStartAt, desiredEndAt, reason } = req.body ?? {};
    if (
      !isUuid(req.params.scheduleId) ||
      typeof desiredStartAt !== 'string' ||
      typeof desiredEndAt !== 'string' ||
      (reason !== undefined && reason !== null && typeof reason !== 'string')
    ) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      const changeRequest = await submitChangeRequest(
        scheduleRepository,
        teamRepository,
        changeRequestRepository,
        {
          scheduleId: req.params.scheduleId,
          actorUserId: req.user!.userId,
          desiredStartAt,
          desiredEndAt,
          reason: reason ?? null,
        },
      );
      res.status(201).json(changeRequest);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.get('/schedules/:scheduleId/change-requests', async (req, res) => {
    if (!isUuid(req.params.scheduleId)) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      const changeRequests = await listChangeRequests(
        scheduleRepository,
        teamRepository,
        changeRequestRepository,
        { scheduleId: req.params.scheduleId, actorUserId: req.user!.userId },
      );
      res.status(200).json(changeRequests);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.post('/change-requests/:id/approve', async (req, res) => {
    if (!isUuid(req.params.id)) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      const changeRequest = await approveChangeRequest(
        teamRepository,
        scheduleRepository,
        changeRequestRepository,
        chatRepository,
        { changeRequestId: req.params.id, actorUserId: req.user!.userId },
      );
      res.status(200).json(changeRequest);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.post('/change-requests/:id/reject', async (req, res) => {
    const { reason } = req.body ?? {};
    if (!isUuid(req.params.id) || typeof reason !== 'string' || reason.length === 0) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      const changeRequest = await rejectChangeRequest(
        teamRepository,
        scheduleRepository,
        changeRequestRepository,
        chatRepository,
        { changeRequestId: req.params.id, actorUserId: req.user!.userId, reason },
      );
      res.status(200).json(changeRequest);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  return router;
}

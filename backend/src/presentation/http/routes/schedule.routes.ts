import { Router } from 'express';
import type { TeamRepository } from '../../../domain/team/team.repository';
import type { ScheduleRepository } from '../../../domain/schedule/schedule.repository';
import { listTeamSchedules } from '../../../application/schedule/list-team-schedules.usecase';
import { createSchedule } from '../../../application/schedule/create-schedule.usecase';
import { updateSchedule } from '../../../application/schedule/update-schedule.usecase';
import { deleteSchedule } from '../../../application/schedule/delete-schedule.usecase';
import { respondToDomainError } from '../error-mapper';
import { isUuid } from '../validation';

function isValidScheduleBody(
  body: unknown,
): body is { title: string; startAt: string; endAt: string; participantUserIds: string[] } {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.title === 'string' &&
    typeof b.startAt === 'string' &&
    typeof b.endAt === 'string' &&
    Array.isArray(b.participantUserIds) &&
    b.participantUserIds.every((id) => typeof id === 'string')
  );
}

// swagger/swagger.json의 /teams/{teamId}/schedules* 계약을 그대로 구현한다.
export function createScheduleRouter(
  teamRepository: TeamRepository,
  scheduleRepository: ScheduleRepository,
): Router {
  const router = Router();

  router.get('/teams/:teamId/schedules', async (req, res) => {
    const { view, date } = req.query;
    if (
      !isUuid(req.params.teamId) ||
      typeof view !== 'string' ||
      !['month', 'week', 'day'].includes(view) ||
      typeof date !== 'string'
    ) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      const schedules = await listTeamSchedules(teamRepository, scheduleRepository, {
        teamId: req.params.teamId,
        actorUserId: req.user!.userId,
      });
      res.status(200).json(schedules);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.post('/teams/:teamId/schedules', async (req, res) => {
    if (!isUuid(req.params.teamId) || !isValidScheduleBody(req.body)) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      const result = await createSchedule(teamRepository, scheduleRepository, {
        teamId: req.params.teamId,
        actorUserId: req.user!.userId,
        title: req.body.title,
        startAt: req.body.startAt,
        endAt: req.body.endAt,
        participantUserIds: req.body.participantUserIds,
      });
      res.status(201).json(result);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.put('/teams/:teamId/schedules/:id', async (req, res) => {
    if (!isUuid(req.params.teamId) || !isUuid(req.params.id) || !isValidScheduleBody(req.body)) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      const result = await updateSchedule(teamRepository, scheduleRepository, {
        teamId: req.params.teamId,
        scheduleId: req.params.id,
        actorUserId: req.user!.userId,
        title: req.body.title,
        startAt: req.body.startAt,
        endAt: req.body.endAt,
        participantUserIds: req.body.participantUserIds,
      });
      res.status(200).json(result);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.delete('/teams/:teamId/schedules/:id', async (req, res) => {
    if (!isUuid(req.params.teamId) || !isUuid(req.params.id)) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      await deleteSchedule(teamRepository, scheduleRepository, {
        teamId: req.params.teamId,
        scheduleId: req.params.id,
        actorUserId: req.user!.userId,
      });
      res.status(204).send();
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  return router;
}

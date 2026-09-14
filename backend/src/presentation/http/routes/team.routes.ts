import { Router } from 'express';
import type { TeamRepository } from '../../../domain/team/team.repository';
import { createTeam } from '../../../application/team/create-team.usecase';
import { getTeam } from '../../../application/team/get-team.usecase';
import { inviteTeamMember } from '../../../application/team/invite-team-member.usecase';
import { joinTeam } from '../../../application/team/join-team.usecase';
import { approveJoinRequest } from '../../../application/team/approve-join-request.usecase';
import { listPendingJoinRequests } from '../../../application/team/list-pending-join-requests.usecase';
import { leaveTeam } from '../../../application/team/leave-team.usecase';
import { delegateLeader } from '../../../application/team/delegate-leader.usecase';
import { listTeamMembers } from '../../../application/team/list-team-members.usecase';
import { respondToDomainError } from '../error-mapper';

// swagger/swagger.json의 /teams* 엔드포인트 계약을 그대로 구현한다.
// 이 라우터는 app.ts에서 인증 미들웨어 이후에 마운트되므로 req.user가 항상 존재한다.
export function createTeamRouter(teamRepository: TeamRepository): Router {
  const router = Router();

  router.post('/teams', async (req, res) => {
    const { name } = req.body ?? {};
    if (typeof name !== 'string' || name.length === 0) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    const team = await createTeam(teamRepository, { name, leaderUserId: req.user!.userId });
    res.status(201).json(team);
  });

  router.get('/teams/:teamId', async (req, res) => {
    try {
      const team = await getTeam(teamRepository, {
        teamId: req.params.teamId,
        actorUserId: req.user!.userId,
      });
      res.status(200).json(team);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.post('/teams/:teamId/invite', async (req, res) => {
    const { email } = req.body ?? {};
    if (typeof email !== 'string' || email.length === 0) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      const result = await inviteTeamMember(teamRepository, {
        teamId: req.params.teamId,
        actorUserId: req.user!.userId,
        invitedEmail: email,
      });
      res.status(201).json(result);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.post('/teams/:teamId/join', async (req, res) => {
    try {
      const joinRequest = await joinTeam(teamRepository, {
        teamId: req.params.teamId,
        userId: req.user!.userId,
      });
      res.status(202).json(joinRequest);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.post('/teams/join-requests/:requestId/approve', async (req, res) => {
    try {
      const membership = await approveJoinRequest(teamRepository, {
        joinRequestId: req.params.requestId,
        actorUserId: req.user!.userId,
      });
      res.status(201).json(membership);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.get('/teams/:teamId/join-requests', async (req, res) => {
    try {
      const requests = await listPendingJoinRequests(teamRepository, {
        teamId: req.params.teamId,
        actorUserId: req.user!.userId,
      });
      res.status(200).json(requests);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.post('/teams/:teamId/leave', async (req, res) => {
    try {
      const result = await leaveTeam(teamRepository, {
        teamId: req.params.teamId,
        userId: req.user!.userId,
      });
      res.status(200).json(result);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.post('/teams/:teamId/delegate-leader', async (req, res) => {
    const { newLeaderUserId } = req.body ?? {};
    if (typeof newLeaderUserId !== 'string' || newLeaderUserId.length === 0) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      const memberships = await delegateLeader(teamRepository, {
        teamId: req.params.teamId,
        actorUserId: req.user!.userId,
        newLeaderUserId,
      });
      res.status(200).json(memberships);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  router.get('/teams/:teamId/members', async (req, res) => {
    try {
      const members = await listTeamMembers(teamRepository, {
        teamId: req.params.teamId,
        actorUserId: req.user!.userId,
      });
      res.status(200).json(members);
    } catch (error) {
      if (respondToDomainError(error, res)) return;
      throw error;
    }
  });

  return router;
}

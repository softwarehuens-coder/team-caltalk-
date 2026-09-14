import type { Pool } from 'pg';
import type { TeamRepository } from '../../../domain/team/team.repository';
import type {
  Team,
  TeamMembership,
  TeamMember,
  TeamJoinRequest,
  TeamJoinRequestStatus,
} from '../../../domain/team/team.entity';
import type { TeamRole } from '../../../domain/permission/permission.policy';
import { withTransaction } from './transaction';
import { ConflictError } from '../../../domain/shared/http-errors';

interface TeamRow {
  id: string;
  name: string;
  created_at: Date;
}

interface MembershipRow {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  created_at: Date;
}

interface TeamMemberRow {
  user_id: string;
  email: string;
  name: string;
  role: TeamRole;
  joined_at: Date;
}

interface TeamJoinRequestRow {
  id: string;
  team_id: string;
  requester_user_id: string;
  status: TeamJoinRequestStatus;
  created_at: Date;
  decided_at: Date | null;
}

function toTeam(row: TeamRow): Team {
  return { id: row.id, name: row.name, createdAt: row.created_at.toISOString() };
}

function toMembership(row: MembershipRow): TeamMembership {
  return {
    id: row.id,
    teamId: row.team_id,
    userId: row.user_id,
    role: row.role,
    createdAt: row.created_at.toISOString(),
  };
}

function toJoinRequest(row: TeamJoinRequestRow): TeamJoinRequest {
  return {
    id: row.id,
    teamId: row.team_id,
    requesterUserId: row.requester_user_id,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    decidedAt: row.decided_at ? row.decided_at.toISOString() : null,
  };
}

function toTeamMember(row: TeamMemberRow): TeamMember {
  return {
    userId: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role,
    joinedAt: row.joined_at.toISOString(),
  };
}

export class PostgresTeamRepository implements TeamRepository {
  constructor(private readonly pool: Pool) {}

  async createTeamWithLeader(
    name: string,
    leaderUserId: string,
  ): Promise<{ team: Team; membership: TeamMembership }> {
    return withTransaction(this.pool, async (client) => {
      const teamResult = await client.query<TeamRow>(
        'INSERT INTO teams (name) VALUES ($1) RETURNING id, name, created_at',
        [name],
      );
      const team = toTeam(teamResult.rows[0]);

      const membershipResult = await client.query<MembershipRow>(
        `INSERT INTO team_memberships (team_id, user_id, role)
         VALUES ($1, $2, 'LEADER')
         RETURNING id, team_id, user_id, role, created_at`,
        [team.id, leaderUserId],
      );

      return { team, membership: toMembership(membershipResult.rows[0]) };
    });
  }

  async findById(teamId: string): Promise<Team | null> {
    const result = await this.pool.query<TeamRow>(
      'SELECT id, name, created_at FROM teams WHERE id = $1',
      [teamId],
    );
    return result.rows[0] ? toTeam(result.rows[0]) : null;
  }

  async findMembership(teamId: string, userId: string): Promise<TeamMembership | null> {
    const result = await this.pool.query<MembershipRow>(
      'SELECT id, team_id, user_id, role, created_at FROM team_memberships WHERE team_id = $1 AND user_id = $2',
      [teamId, userId],
    );
    return result.rows[0] ? toMembership(result.rows[0]) : null;
  }

  async countMembers(teamId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM team_memberships WHERE team_id = $1',
      [teamId],
    );
    return Number(result.rows[0].count);
  }

  async addMember(teamId: string, userId: string, role: TeamRole): Promise<TeamMembership> {
    const result = await this.pool.query<MembershipRow>(
      `INSERT INTO team_memberships (team_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING id, team_id, user_id, role, created_at`,
      [teamId, userId, role],
    );
    return toMembership(result.rows[0]);
  }

  async createJoinRequest(teamId: string, requesterUserId: string): Promise<TeamJoinRequest> {
    try {
      const result = await this.pool.query<TeamJoinRequestRow>(
        `INSERT INTO team_join_requests (team_id, requester_user_id)
         VALUES ($1, $2)
         RETURNING id, team_id, requester_user_id, status, created_at, decided_at`,
        [teamId, requesterUserId],
      );
      return toJoinRequest(result.rows[0]);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error &&
          (error as { code?: string }).code === '23505') {
        throw new ConflictError('JOIN_REQUEST_ALREADY_PENDING', '이미 처리 대기 중인 가입 요청이 있습니다.');
      }
      throw error;
    }
  }

  async findJoinRequest(joinRequestId: string): Promise<TeamJoinRequest | null> {
    const result = await this.pool.query<TeamJoinRequestRow>(
      `SELECT id, team_id, requester_user_id, status, created_at, decided_at
       FROM team_join_requests WHERE id = $1`,
      [joinRequestId],
    );
    return result.rows[0] ? toJoinRequest(result.rows[0]) : null;
  }

  async listPendingJoinRequests(teamId: string): Promise<TeamJoinRequest[]> {
    const result = await this.pool.query<TeamJoinRequestRow>(
      `SELECT id, team_id, requester_user_id, status, created_at, decided_at
       FROM team_join_requests
       WHERE team_id = $1 AND status = 'PENDING'
       ORDER BY created_at ASC`,
      [teamId],
    );
    return result.rows.map(toJoinRequest);
  }

  async approveJoinRequest(teamId: string, joinRequestId: string): Promise<TeamMembership | null> {
    return withTransaction(this.pool, async (client) => {
      const requestResult = await client.query<TeamJoinRequestRow>(
        `UPDATE team_join_requests
         SET status = 'APPROVED', decided_at = now()
         WHERE id = $1 AND team_id = $2 AND status = 'PENDING'
         RETURNING id, team_id, requester_user_id, status, created_at, decided_at`,
        [joinRequestId, teamId],
      );
      if (requestResult.rows.length === 0) return null;

      const request = requestResult.rows[0];
      const membershipResult = await client.query<MembershipRow>(
        `INSERT INTO team_memberships (team_id, user_id, role)
         VALUES ($1, $2, 'MEMBER')
         RETURNING id, team_id, user_id, role, created_at`,
        [request.team_id, request.requester_user_id],
      );
      return toMembership(membershipResult.rows[0]);
    });
  }

  async listMembers(teamId: string): Promise<TeamMember[]> {
    const result = await this.pool.query<TeamMemberRow>(
      `SELECT tm.user_id AS user_id, u.email AS email, u.name AS name, tm.role AS role,
              tm.created_at AS joined_at
       FROM team_memberships tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1
       ORDER BY tm.created_at ASC`,
      [teamId],
    );
    return result.rows.map(toTeamMember);
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    await this.pool.query('DELETE FROM team_memberships WHERE team_id = $1 AND user_id = $2', [
      teamId,
      userId,
    ]);
  }

  async deleteTeam(teamId: string): Promise<void> {
    // 팀 해체 — schedules/schedule_participants/chats/chat_messages/change_requests/
    // team_memberships가 FK ON DELETE CASCADE로 함께 삭제된다(database/schema.sql).
    await this.pool.query('DELETE FROM teams WHERE id = $1', [teamId]);
  }

  async transferLeadership(
    teamId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<TeamMembership[]> {
    return withTransaction(this.pool, async (client) => {
      // uq_team_memberships_one_leader_per_team는 즉시(immediate) 유니크 인덱스이므로,
      // 기존 팀장을 MEMBER로 먼저 내린 뒤 신규 팀장을 LEADER로 올려야 트랜잭션 중간에도
      // "팀당 LEADER 최대 1명" 제약을 위반하지 않는다(순서를 바꾸면 위반한다).
      await client.query(
        "UPDATE team_memberships SET role = 'MEMBER' WHERE team_id = $1 AND user_id = $2",
        [teamId, fromUserId],
      );
      await client.query(
        "UPDATE team_memberships SET role = 'LEADER' WHERE team_id = $1 AND user_id = $2",
        [teamId, toUserId],
      );

      const result = await client.query<MembershipRow>(
        'SELECT id, team_id, user_id, role, created_at FROM team_memberships WHERE team_id = $1 ORDER BY created_at ASC',
        [teamId],
      );
      return result.rows.map(toMembership);
    });
  }
}

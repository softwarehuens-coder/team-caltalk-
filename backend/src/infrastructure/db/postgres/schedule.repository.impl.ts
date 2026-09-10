import type { Pool, PoolClient } from 'pg';
import type {
  ScheduleRepository,
  CreateScheduleInput,
  UpdateScheduleInput,
} from '../../../domain/schedule/schedule.repository';
import type { Schedule, ScheduleParticipant } from '../../../domain/schedule/schedule.entity';
import { withTransaction } from './transaction';

interface ScheduleRow {
  id: string;
  team_id: string;
  title: string;
  start_at: Date;
  end_at: Date;
  created_at: Date;
  deleted_at: Date | null;
}

interface ParticipantRow {
  id: string;
  schedule_id: string;
  user_id: string;
  created_at: Date;
}

function toParticipant(row: ParticipantRow): ScheduleParticipant {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    userId: row.user_id,
    createdAt: row.created_at.toISOString(),
  };
}

function toSchedule(row: ScheduleRow, participants: ScheduleParticipant[]): Schedule {
  return {
    id: row.id,
    teamId: row.team_id,
    title: row.title,
    startAt: row.start_at.toISOString(),
    endAt: row.end_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
    participants,
  };
}

async function insertParticipants(
  client: PoolClient,
  scheduleId: string,
  userIds: string[],
): Promise<ScheduleParticipant[]> {
  const participants: ScheduleParticipant[] = [];
  for (const userId of userIds) {
    const result = await client.query<ParticipantRow>(
      `INSERT INTO schedule_participants (schedule_id, user_id)
       VALUES ($1, $2)
       RETURNING id, schedule_id, user_id, created_at`,
      [scheduleId, userId],
    );
    participants.push(toParticipant(result.rows[0]));
  }
  return participants;
}

export class PostgresScheduleRepository implements ScheduleRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateScheduleInput): Promise<Schedule> {
    return withTransaction(this.pool, async (client) => {
      const scheduleResult = await client.query<ScheduleRow>(
        `INSERT INTO schedules (team_id, title, start_at, end_at)
         VALUES ($1, $2, $3, $4)
         RETURNING id, team_id, title, start_at, end_at, created_at, deleted_at`,
        [input.teamId, input.title, input.startAt, input.endAt],
      );
      const scheduleRow = scheduleResult.rows[0];

      const participants = await insertParticipants(
        client,
        scheduleRow.id,
        input.participantUserIds,
      );

      // 일정 1:1 채팅(도메인정의서 6장) — 일정 생성과 원자적으로 chats 행을 만든다
      // (BE-6/BE-8이 이 chats 행을 통해 이력 조회/실시간 송수신을 수행한다).
      await client.query('INSERT INTO chats (schedule_id) VALUES ($1)', [scheduleRow.id]);

      return toSchedule(scheduleRow, participants);
    });
  }

  async update(
    teamId: string,
    scheduleId: string,
    input: UpdateScheduleInput,
  ): Promise<Schedule | null> {
    return withTransaction(this.pool, async (client) => {
      const scheduleResult = await client.query<ScheduleRow>(
        `UPDATE schedules
         SET title = $1, start_at = $2, end_at = $3
         WHERE id = $4 AND team_id = $5 AND deleted_at IS NULL
         RETURNING id, team_id, title, start_at, end_at, created_at, deleted_at`,
        [input.title, input.startAt, input.endAt, scheduleId, teamId],
      );
      if (scheduleResult.rows.length === 0) {
        return null;
      }
      const scheduleRow = scheduleResult.rows[0];

      await client.query('DELETE FROM schedule_participants WHERE schedule_id = $1', [scheduleId]);
      const participants = await insertParticipants(client, scheduleId, input.participantUserIds);

      return toSchedule(scheduleRow, participants);
    });
  }

  async softDelete(teamId: string, scheduleId: string): Promise<boolean> {
    // deleted_at만 UPDATE한다 — 실제 DELETE가 아니므로 chats/chat_messages에
    // CASCADE가 발생하지 않는다(SC2, CLAUDE.md 도메인 불변조건).
    const result = await this.pool.query(
      `UPDATE schedules SET deleted_at = now()
       WHERE id = $1 AND team_id = $2 AND deleted_at IS NULL`,
      [scheduleId, teamId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findById(scheduleId: string): Promise<Schedule | null> {
    const scheduleResult = await this.pool.query<ScheduleRow>(
      `SELECT id, team_id, title, start_at, end_at, created_at, deleted_at
       FROM schedules
       WHERE id = $1`,
      [scheduleId],
    );
    if (scheduleResult.rows.length === 0) {
      return null;
    }
    const row = scheduleResult.rows[0];

    const participantResult = await this.pool.query<ParticipantRow>(
      `SELECT id, schedule_id, user_id, created_at FROM schedule_participants WHERE schedule_id = $1`,
      [scheduleId],
    );

    return toSchedule(row, participantResult.rows.map(toParticipant));
  }

  async listActiveByTeam(teamId: string): Promise<Schedule[]> {
    // DB-5(#8)에서 EXPLAIN ANALYZE로 검증된 인덱스 사용 쿼리 패턴을 그대로 재사용한다.
    const scheduleResult = await this.pool.query<ScheduleRow>(
      `SELECT id, team_id, title, start_at, end_at, created_at, deleted_at
       FROM schedules
       WHERE team_id = $1 AND deleted_at IS NULL
       ORDER BY start_at ASC`,
      [teamId],
    );
    const scheduleRows = scheduleResult.rows;
    if (scheduleRows.length === 0) {
      return [];
    }

    const scheduleIds = scheduleRows.map((row) => row.id);
    const participantResult = await this.pool.query<ParticipantRow>(
      `SELECT id, schedule_id, user_id, created_at
       FROM schedule_participants
       WHERE schedule_id = ANY($1::uuid[])`,
      [scheduleIds],
    );

    const participantsBySchedule = new Map<string, ScheduleParticipant[]>();
    for (const row of participantResult.rows) {
      const participant = toParticipant(row);
      const list = participantsBySchedule.get(participant.scheduleId) ?? [];
      list.push(participant);
      participantsBySchedule.set(participant.scheduleId, list);
    }

    return scheduleRows.map((row) => toSchedule(row, participantsBySchedule.get(row.id) ?? []));
  }
}

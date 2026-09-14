import type { Pool } from 'pg';
import type {
  ChangeRequestRepository,
  CreateChangeRequestInput,
  ApprovedResult,
} from '../../../domain/change-request/change-request.repository';
import type {
  ChangeRequest,
  ChangeRequestStatus,
} from '../../../domain/change-request/change-request.entity';
import type { Schedule } from '../../../domain/schedule/schedule.entity';
import { NotFoundError } from '../../../domain/shared/http-errors';
import { withTransaction } from './transaction';

interface ChangeRequestRow {
  id: string;
  schedule_id: string;
  requested_by_user_id: string;
  status: ChangeRequestStatus;
  desired_start_at: Date;
  desired_end_at: Date;
  reason: string | null;
  created_at: Date;
  decided_at: Date | null;
}

interface ScheduleRow {
  id: string;
  team_id: string;
  title: string;
  start_at: Date;
  end_at: Date;
  created_at: Date;
  deleted_at: Date | null;
}

function toChangeRequest(row: ChangeRequestRow): ChangeRequest {
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    requestedByUserId: row.requested_by_user_id,
    status: row.status,
    desiredStartAt: row.desired_start_at.toISOString(),
    desiredEndAt: row.desired_end_at.toISOString(),
    reason: row.reason,
    createdAt: row.created_at.toISOString(),
    decidedAt: row.decided_at ? row.decided_at.toISOString() : null,
  };
}

function toSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    teamId: row.team_id,
    title: row.title,
    startAt: row.start_at.toISOString(),
    endAt: row.end_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
    participants: [],
  };
}

export class PostgresChangeRequestRepository implements ChangeRequestRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateChangeRequestInput): Promise<ChangeRequest> {
    const result = await this.pool.query<ChangeRequestRow>(
      `INSERT INTO change_requests (schedule_id, requested_by_user_id, desired_start_at, desired_end_at, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, schedule_id, requested_by_user_id, status, desired_start_at, desired_end_at, reason, created_at, decided_at`,
      [
        input.scheduleId,
        input.requestedByUserId,
        input.desiredStartAt,
        input.desiredEndAt,
        input.reason,
      ],
    );
    return toChangeRequest(result.rows[0]);
  }

  async findById(changeRequestId: string): Promise<ChangeRequest | null> {
    const result = await this.pool.query<ChangeRequestRow>(
      `SELECT id, schedule_id, requested_by_user_id, status, desired_start_at, desired_end_at, reason, created_at, decided_at
       FROM change_requests WHERE id = $1`,
      [changeRequestId],
    );
    return result.rows[0] ? toChangeRequest(result.rows[0]) : null;
  }

  async approve(changeRequestId: string): Promise<ApprovedResult | null> {
    return withTransaction(this.pool, async (client) => {
      // PENDING인 요청만 전이시킨다 — 이미 결정된 요청의 재승인을 원자적으로 막는다(409 케이스).
      const crResult = await client.query<ChangeRequestRow>(
        `UPDATE change_requests
         SET status = 'APPROVED', decided_at = now()
         WHERE id = $1 AND status = 'PENDING'
         RETURNING id, schedule_id, requested_by_user_id, status, desired_start_at, desired_end_at, reason, created_at, decided_at`,
        [changeRequestId],
      );
      if (crResult.rows.length === 0) {
        return null;
      }
      const changeRequestRow = crResult.rows[0];

      const scheduleResult = await client.query<ScheduleRow>(
        `UPDATE schedules
         SET start_at = $1, end_at = $2
         WHERE id = $3
         RETURNING id, team_id, title, start_at, end_at, created_at, deleted_at`,
        [
          changeRequestRow.desired_start_at,
          changeRequestRow.desired_end_at,
          changeRequestRow.schedule_id,
        ],
      );
      if (scheduleResult.rows.length === 0) {
        // 대상 일정이 사라진 예외 상황 — 이 오류로 트랜잭션 전체가 ROLLBACK되어
        // change_requests.status도 PENDING으로 되돌아간다(SC3 원자성).
        throw new NotFoundError('SCHEDULE_NOT_FOUND', '승인 대상 일정을 찾을 수 없습니다.');
      }

      return {
        changeRequest: toChangeRequest(changeRequestRow),
        schedule: toSchedule(scheduleResult.rows[0]),
      };
    });
  }

  async reject(changeRequestId: string): Promise<ChangeRequest | null> {
    // 원본 schedules는 절대 갱신하지 않는다 — status/decided_at만 바뀐다.
    const result = await this.pool.query<ChangeRequestRow>(
      `UPDATE change_requests
       SET status = 'REJECTED', decided_at = now()
       WHERE id = $1 AND status = 'PENDING'
       RETURNING id, schedule_id, requested_by_user_id, status, desired_start_at, desired_end_at, reason, created_at, decided_at`,
      [changeRequestId],
    );
    return result.rows[0] ? toChangeRequest(result.rows[0]) : null;
  }

  async listBySchedule(scheduleId: string): Promise<ChangeRequest[]> {
    const result = await this.pool.query<ChangeRequestRow>(
      `SELECT id, schedule_id, requested_by_user_id, status, desired_start_at, desired_end_at, reason, created_at, decided_at
       FROM change_requests
       WHERE schedule_id = $1
       ORDER BY created_at ASC`,
      [scheduleId],
    );
    return result.rows.map(toChangeRequest);
  }
}

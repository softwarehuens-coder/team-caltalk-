import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testPool, createTestUser, deleteTestUser } from './support/db';
import { PostgresTeamRepository } from '../../src/infrastructure/db/postgres/team.repository.impl';
import { PostgresScheduleRepository } from '../../src/infrastructure/db/postgres/schedule.repository.impl';
import { PostgresChangeRequestRepository } from '../../src/infrastructure/db/postgres/change-request.repository.impl';
import { withTransaction } from '../../src/infrastructure/db/postgres/transaction';

// BE-7 DoD(SC3 핵심): 승인 트랜잭션이 원자적인지, 그리고 PENDING 가드가 동시
// 재승인 경쟁 상황에서도 정확히 1건만 성공시키는지 실제 DB로 검증한다.

describe('변경 요청 승인 트랜잭션 원자성 (통합)', () => {
  const teamRepository = new PostgresTeamRepository(testPool);
  const scheduleRepository = new PostgresScheduleRepository(testPool);
  const changeRequestRepository = new PostgresChangeRequestRepository(testPool);

  let leaderUserId: string;
  let teamId: string;
  let scheduleId: string;
  const originalStartAt = new Date('2026-09-10T01:00:00.000Z');
  const originalEndAt = new Date('2026-09-10T02:00:00.000Z');

  beforeAll(async () => {
    leaderUserId = await createTestUser(`be7-approval-${Date.now()}@example.com`, '통합테스트리더');
    const { team } = await teamRepository.createTeamWithLeader('BE-7 통합테스트팀', leaderUserId);
    teamId = team.id;

    const schedule = await scheduleRepository.create({
      teamId,
      title: 'BE-7 통합테스트 일정',
      startAt: originalStartAt.toISOString(),
      endAt: originalEndAt.toISOString(),
      participantUserIds: [leaderUserId],
    });
    scheduleId = schedule.id;
  });

  afterAll(async () => {
    await teamRepository.deleteTeam(teamId);
    await deleteTestUser(leaderUserId);
    await testPool.end();
  });

  it('두 번째 UPDATE가 실패하면 change_requests.status와 schedules 값 모두 롤백된다(원자성)', async () => {
    const changeRequest = await changeRequestRepository.create({
      scheduleId,
      requestedByUserId: leaderUserId,
      desiredStartAt: '2026-09-11T01:00:00.000Z',
      desiredEndAt: '2026-09-11T02:00:00.000Z',
      reason: '원자성 테스트',
    });

    await expect(
      withTransaction(testPool, async (client) => {
        await client.query(
          "UPDATE change_requests SET status = 'APPROVED', decided_at = now() WHERE id = $1",
          [changeRequest.id],
        );
        // schedules.start_at은 timestamptz이므로 문자열 'not-a-timestamp'는 반드시 오류를 낸다
        // (approve()가 실제로 겪을 수 있는 "두 번째 UPDATE 실패" 상황을 그대로 재현).
        await client.query("UPDATE schedules SET start_at = 'not-a-timestamp' WHERE id = $1", [
          scheduleId,
        ]);
      }),
    ).rejects.toThrow();

    const crRow = await testPool.query<{ status: string }>(
      'SELECT status FROM change_requests WHERE id = $1',
      [changeRequest.id],
    );
    expect(crRow.rows[0].status).toBe('PENDING'); // APPROVED로 남지 않음

    const scheduleRow = await testPool.query<{ start_at: Date }>(
      'SELECT start_at FROM schedules WHERE id = $1',
      [scheduleId],
    );
    expect(scheduleRow.rows[0].start_at.toISOString()).toBe(originalStartAt.toISOString());
  });

  it('정상 승인은 change_requests.status와 schedules.start_at/end_at을 함께 갱신한다', async () => {
    const changeRequest = await changeRequestRepository.create({
      scheduleId,
      requestedByUserId: leaderUserId,
      desiredStartAt: '2026-09-12T01:00:00.000Z',
      desiredEndAt: '2026-09-12T02:00:00.000Z',
      reason: null,
    });

    const result = await changeRequestRepository.approve(changeRequest.id);

    expect(result).not.toBeNull();
    expect(result!.changeRequest.status).toBe('APPROVED');
    expect(result!.changeRequest.decidedAt).not.toBeNull();
    expect(result!.schedule.startAt).toBe('2026-09-12T01:00:00.000Z');
    expect(result!.schedule.endAt).toBe('2026-09-12T02:00:00.000Z');
  });

  it('동시에 두 번 승인 시도하면 정확히 1건만 성공하고 나머지는 null(409)이다(PENDING 가드 원자성)', async () => {
    const changeRequest = await changeRequestRepository.create({
      scheduleId,
      requestedByUserId: leaderUserId,
      desiredStartAt: '2026-09-13T01:00:00.000Z',
      desiredEndAt: '2026-09-13T02:00:00.000Z',
      reason: null,
    });

    const [first, second] = await Promise.all([
      changeRequestRepository.approve(changeRequest.id),
      changeRequestRepository.approve(changeRequest.id),
    ]);

    const successes = [first, second].filter((r) => r !== null);
    const failures = [first, second].filter((r) => r === null);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });
});

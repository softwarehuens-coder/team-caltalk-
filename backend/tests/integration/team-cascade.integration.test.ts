import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testPool, createTestUser, deleteTestUser } from './support/db';
import { PostgresTeamRepository } from '../../src/infrastructure/db/postgres/team.repository.impl';

// BE-4 DoD: 팀 해체 시 schedules/schedule_participants/chats/chat_messages/
// change_requests가 실제 CASCADE 삭제되는지 실제 DB로 검증한다(DB-2 수동 검증의
// 자동화 버전). team_memberships에 대한 CASCADE는 schema.sql에 이미 존재하므로
// 함께 확인한다.

describe('팀 해체 CASCADE (통합)', () => {
  const teamRepository = new PostgresTeamRepository(testPool);
  let leaderUserId: string;

  beforeAll(async () => {
    leaderUserId = await createTestUser(`be4-cascade-${Date.now()}@example.com`, '통합테스트리더');
  });

  afterAll(async () => {
    await deleteTestUser(leaderUserId);
    await testPool.end();
  });

  it('팀 해체 시 하위 스케줄/채팅/변경요청/멤버십이 모두 함께 삭제된다', async () => {
    const { team } = await teamRepository.createTeamWithLeader('통합테스트팀', leaderUserId);

    const scheduleResult = await testPool.query<{ id: string }>(
      `INSERT INTO schedules (team_id, title, start_at, end_at)
       VALUES ($1, '통합테스트 일정', now(), now() + interval '1 hour')
       RETURNING id`,
      [team.id],
    );
    const scheduleId = scheduleResult.rows[0].id;

    await testPool.query(
      `INSERT INTO schedule_participants (schedule_id, user_id) VALUES ($1, $2)`,
      [scheduleId, leaderUserId],
    );

    const chatResult = await testPool.query<{ id: string }>(
      `INSERT INTO chats (schedule_id) VALUES ($1) RETURNING id`,
      [scheduleId],
    );
    const chatId = chatResult.rows[0].id;

    await testPool.query(
      `INSERT INTO chat_messages (chat_id, sender_user_id, content) VALUES ($1, $2, '테스트 메시지')`,
      [chatId, leaderUserId],
    );

    await testPool.query(
      `INSERT INTO change_requests (schedule_id, requested_by_user_id, desired_start_at, desired_end_at)
       VALUES ($1, $2, now(), now() + interval '2 hour')`,
      [scheduleId, leaderUserId],
    );

    await teamRepository.deleteTeam(team.id);

    const [teams, memberships, schedules, participants, chats, chatMessages, changeRequests] =
      await Promise.all([
        testPool.query('SELECT 1 FROM teams WHERE id = $1', [team.id]),
        testPool.query('SELECT 1 FROM team_memberships WHERE team_id = $1', [team.id]),
        testPool.query('SELECT 1 FROM schedules WHERE id = $1', [scheduleId]),
        testPool.query('SELECT 1 FROM schedule_participants WHERE schedule_id = $1', [scheduleId]),
        testPool.query('SELECT 1 FROM chats WHERE id = $1', [chatId]),
        testPool.query('SELECT 1 FROM chat_messages WHERE chat_id = $1', [chatId]),
        testPool.query('SELECT 1 FROM change_requests WHERE schedule_id = $1', [scheduleId]),
      ]);

    expect(teams.rowCount).toBe(0);
    expect(memberships.rowCount).toBe(0);
    expect(schedules.rowCount).toBe(0);
    expect(participants.rowCount).toBe(0);
    expect(chats.rowCount).toBe(0);
    expect(chatMessages.rowCount).toBe(0);
    expect(changeRequests.rowCount).toBe(0);

    // 팀 해체가 사용자 계정 자체를 삭제하지는 않는다.
    const user = await testPool.query('SELECT 1 FROM users WHERE id = $1', [leaderUserId]);
    expect(user.rowCount).toBe(1);
  });
});

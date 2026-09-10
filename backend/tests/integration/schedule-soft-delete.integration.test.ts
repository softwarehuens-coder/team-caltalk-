import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testPool, createTestUser, deleteTestUser } from './support/db';
import { PostgresTeamRepository } from '../../src/infrastructure/db/postgres/team.repository.impl';
import { PostgresScheduleRepository } from '../../src/infrastructure/db/postgres/schedule.repository.impl';

// BE-5 DoD: 소프트 삭제(schedules.deleted_at UPDATE) 후에도 채팅 이력
// (chats/chat_messages)이 보존되는지 실제 DB로 검증한다(SC2).

describe('일정 소프트 삭제와 채팅 이력 보존 (통합)', () => {
  const teamRepository = new PostgresTeamRepository(testPool);
  const scheduleRepository = new PostgresScheduleRepository(testPool);
  let leaderUserId: string;
  let teamId: string;

  beforeAll(async () => {
    leaderUserId = await createTestUser(
      `be5-softdelete-${Date.now()}@example.com`,
      '통합테스트리더',
    );
    const { team } = await teamRepository.createTeamWithLeader('BE-5 통합테스트팀', leaderUserId);
    teamId = team.id;
  });

  afterAll(async () => {
    await teamRepository.deleteTeam(teamId);
    await deleteTestUser(leaderUserId);
    await testPool.end();
  });

  it('일정 생성 시 chats 1건이 자동 생성되고, 소프트 삭제 후에도 chats/chat_messages가 보존된다', async () => {
    const schedule = await scheduleRepository.create({
      teamId,
      title: '통합테스트 일정',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3600_000).toISOString(),
      participantUserIds: [leaderUserId],
    });

    const chatResult = await testPool.query<{ id: string }>(
      'SELECT id FROM chats WHERE schedule_id = $1',
      [schedule.id],
    );
    expect(chatResult.rowCount).toBe(1);
    const chatId = chatResult.rows[0].id;

    await testPool.query(
      `INSERT INTO chat_messages (chat_id, sender_user_id, content) VALUES ($1, $2, '삭제 전 메시지')`,
      [chatId, leaderUserId],
    );

    const deleted = await scheduleRepository.softDelete(teamId, schedule.id);
    expect(deleted).toBe(true);

    const scheduleRow = await testPool.query<{ deleted_at: Date | null }>(
      'SELECT deleted_at FROM schedules WHERE id = $1',
      [schedule.id],
    );
    expect(scheduleRow.rows[0].deleted_at).not.toBeNull();

    const chatAfter = await testPool.query('SELECT 1 FROM chats WHERE id = $1', [chatId]);
    expect(chatAfter.rowCount).toBe(1);

    const messagesAfter = await testPool.query('SELECT 1 FROM chat_messages WHERE chat_id = $1', [
      chatId,
    ]);
    expect(messagesAfter.rowCount).toBe(1);

    // 소프트 삭제된 일정은 목록 조회(SC1 쿼리)에서 제외되어야 한다.
    const activeSchedules = await scheduleRepository.listActiveByTeam(teamId);
    expect(activeSchedules.find((s) => s.id === schedule.id)).toBeUndefined();
  });
});

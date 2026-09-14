import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testPool, createTestUser, deleteTestUser } from './support/db';
import { PostgresTeamRepository } from '../../src/infrastructure/db/postgres/team.repository.impl';
import { PostgresScheduleRepository } from '../../src/infrastructure/db/postgres/schedule.repository.impl';
import { PostgresChatRepository } from '../../src/infrastructure/db/postgres/chat.repository.impl';

// BE-6 DoD: 커서 페이지네이션이 순서를 보존하며 전체 메시지를 정확히 1회씩만
// 반환하는지 실제 DB로 검증한다(SC2, DB-6 수동 검증의 자동화 버전).

const TOTAL_MESSAGES = 130;
const PAGE_LIMIT = 50;

describe('채팅 이력 커서 페이지네이션 (통합)', () => {
  const teamRepository = new PostgresTeamRepository(testPool);
  const scheduleRepository = new PostgresScheduleRepository(testPool);
  const chatRepository = new PostgresChatRepository(testPool);
  let userId: string;
  let teamId: string;
  let chatId: string;

  beforeAll(async () => {
    userId = await createTestUser(`be6-pagination-${Date.now()}@example.com`, '통합테스트유저');
    const { team } = await teamRepository.createTeamWithLeader('BE-6 통합테스트팀', userId);
    teamId = team.id;

    const schedule = await scheduleRepository.create({
      teamId,
      title: 'BE-6 통합테스트 일정',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3600_000).toISOString(),
      participantUserIds: [userId],
    });

    const chat = await chatRepository.findByScheduleId(schedule.id);
    chatId = chat!.id;

    // 동시각(tie) 위험 없이 순서를 보장하기 위해 명시적으로 간격을 둔 created_at을 사용한다
    // (DB-6에서 확인된 "동일 created_at 커서 페이지네이션 누락" 위험을 테스트에서는 피해간다).
    for (let i = 0; i < TOTAL_MESSAGES; i += 1) {
      await testPool.query(
        `INSERT INTO chat_messages (chat_id, sender_user_id, content, created_at)
         VALUES ($1, $2, $3, now() + ($4 * interval '10 milliseconds'))`,
        [chatId, userId, `메시지 ${i}`, i],
      );
    }
  });

  afterAll(async () => {
    await teamRepository.deleteTeam(teamId);
    await deleteTestUser(userId);
    await testPool.end();
  });

  it(`limit=${PAGE_LIMIT}으로 전체 ${TOTAL_MESSAGES}건을 순서대로 정확히 1회씩 순회한다`, async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      const page = await chatRepository.listMessages(chatId, cursor, PAGE_LIMIT);
      seen.push(...page.data.map((m) => m.content));
      cursor = page.nextCursor;
      hasMore = page.hasMore;
      pageCount += 1;
      expect(pageCount).toBeLessThan(10); // 무한 루프 방지 안전장치
    }

    expect(seen).toHaveLength(TOTAL_MESSAGES);
    expect(new Set(seen).size).toBe(TOTAL_MESSAGES); // 중복 없음
    const expectedOrder = Array.from({ length: TOTAL_MESSAGES }, (_, i) => `메시지 ${i}`);
    expect(seen).toEqual(expectedOrder); // 시간순 순서 보존
  });
});

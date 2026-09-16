import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { testPool } from './support/db';
import { createApp } from '../../src/app';
import {
  registerAndLogin,
  createTeamWithMembers,
  type AuthedUser,
} from './support/scenario-helpers';

// UC5(실시간 채팅)를 과거 WebSocket(chat.gateway.ts, 제거됨) 대신 REST 롱폴링/전송
// 엔드포인트로 재구현했음을 실제 HTTP 앱 + 실제 DB로 검증한다(chat-gateway.integration.test.ts
// 대체). 검증 항목: 팀 비소속 차단, 전송 즉시 응답, 폴링이 이후 도착한 메시지를
// 실제로 대기해 잡아낸다는 것.
describe('채팅 롱폴링/전송 (통합)', () => {
  let app: Express;
  const teamIdsToCleanup: string[] = [];
  const userIdsToCleanup: string[] = [];

  let leader: AuthedUser;
  let member: AuthedUser;
  let outsider: AuthedUser;
  let teamId: string;
  let scheduleId: string;

  beforeAll(async () => {
    app = createApp(testPool, 'chat-polling-test-secret');

    leader = await registerAndLogin(app, 'be8-poll-leader', '팀장');
    member = await registerAndLogin(app, 'be8-poll-member', '팀원');
    outsider = await registerAndLogin(app, 'be8-poll-outsider', '외부인');
    userIdsToCleanup.push(leader.userId, member.userId, outsider.userId);

    teamId = await createTeamWithMembers(app, leader, 'BE-8 롱폴링 통합테스트팀', [member]);
    teamIdsToCleanup.push(teamId);

    const schedule = await request(app)
      .post(`/teams/${teamId}/schedules`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({
        title: '롱폴링 통합테스트 일정',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 3600_000).toISOString(),
        participantUserIds: [leader.userId, member.userId],
      });
    // createSchedule 응답은 { schedule, conflictWarnings } 형태다(BE-10 충돌 감지).
    scheduleId = schedule.body.schedule.id;
  });

  afterAll(async () => {
    for (const id of teamIdsToCleanup) {
      await testPool.query('DELETE FROM teams WHERE id = $1', [id]);
    }
    for (const id of userIdsToCleanup) {
      await testPool.query('DELETE FROM users WHERE id = $1', [id]);
    }
    await testPool.end();
  });

  it('팀 비소속 사용자는 메시지 전송/폴링 모두 403이다', async () => {
    const send = await request(app)
      .post(`/schedules/${scheduleId}/messages`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ content: '외부인 메시지' });
    expect(send.status).toBe(403);

    const poll = await request(app)
      .get(`/schedules/${scheduleId}/messages/poll`)
      .query({ timeout: 50 })
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(poll.status).toBe(403);
  });

  it('메시지를 전송하면 저장된 메시지를 즉시 응답으로 돌려준다', async () => {
    const response = await request(app)
      .post(`/schedules/${scheduleId}/messages`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ content: '즉시 응답 확인' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ content: '즉시 응답 확인', senderUserId: member.userId });
  });

  it('cursor 이전에 이미 존재하는 메시지가 있으면 폴링이 대기 없이 즉시 반환한다', async () => {
    const sent = await request(app)
      .post(`/schedules/${scheduleId}/messages`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({ content: '이미 존재하는 메시지' });

    const poll = await request(app)
      .get(`/schedules/${scheduleId}/messages/poll`)
      .query({ timeout: 5000 })
      .set('Authorization', `Bearer ${member.token}`);

    expect(poll.status).toBe(200);
    expect(poll.body.data.map((m: { content: string }) => m.content)).toContain(
      '이미 존재하는 메시지',
    );
    expect(poll.body.data.map((m: { id: string }) => m.id)).toContain(sent.body.id);
  });

  it('새 메시지가 없으면 timeout까지 대기한 뒤 빈 결과를 반환한다', async () => {
    // "새 메시지 없음"만 순수하게 검증하려는 것이므로, 확실히 미래인 커서를 쓴다.
    const futureCursor = new Date(Date.now() + 60_000).toISOString();

    const started = Date.now();
    const poll = await request(app)
      .get(`/schedules/${scheduleId}/messages/poll`)
      .query({ cursor: futureCursor, timeout: 300 })
      .set('Authorization', `Bearer ${member.token}`);
    const elapsedMs = Date.now() - started;

    expect(poll.status).toBe(200);
    expect(poll.body.data).toEqual([]);
    expect(elapsedMs).toBeGreaterThanOrEqual(250);
  }, 10000);

  it('폴링 중에 새 메시지가 도착하면 대기하다 그 메시지를 잡아 반환하고, 커서 기준점 메시지는 다시 포함하지 않는다', async () => {
    const cursorResponse = await request(app)
      .post(`/schedules/${scheduleId}/messages`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ content: '폴링 시작 기준점' });

    const pollPromise = request(app)
      .get(`/schedules/${scheduleId}/messages/poll`)
      .query({ cursor: cursorResponse.body.createdAt, timeout: 5000 })
      .set('Authorization', `Bearer ${member.token}`);

    await new Promise((resolve) => setTimeout(resolve, 200));
    await request(app)
      .post(`/schedules/${scheduleId}/messages`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({ content: '폴링 중 도착한 메시지' });

    const poll = await pollPromise;
    const contents = poll.body.data.map((m: { content: string }) => m.content);

    expect(poll.status).toBe(200);
    expect(contents).toContain('폴링 중 도착한 메시지');
    // 커서로 사용한 자기 자신의 createdAt은 다시 반환되면 안 된다 — 마이크로초
    // 정밀도가 잘린 커서를 쓰면 "created_at > cursor" 비교에서 자기 자신이 다시
    // 걸려 무한 재수신 폭주로 이어졌던 회귀(chat.repository.impl.ts의 cursor_value
    // 참조)를 잡아내는 검증이다.
    expect(contents).not.toContain('폴링 시작 기준점');
  }, 10000);

  it('메시지를 보낸 직후 그 응답의 createdAt을 커서로 폴링하면 자기 자신을 다시 받지 않는다', async () => {
    const sent = await request(app)
      .post(`/schedules/${scheduleId}/messages`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({ content: '자기 자신 재수신 방지 확인' });

    const poll = await request(app)
      .get(`/schedules/${scheduleId}/messages/poll`)
      .query({ cursor: sent.body.createdAt, timeout: 300 })
      .set('Authorization', `Bearer ${member.token}`);

    expect(poll.status).toBe(200);
    expect(poll.body.data).toEqual([]);
  }, 10000);
});

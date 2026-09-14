import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server as HttpServer } from 'http';
import { WebSocket } from 'ws';
import { testPool, createTestUser, deleteTestUser } from './support/db';
import { PostgresTeamRepository } from '../../src/infrastructure/db/postgres/team.repository.impl';
import { PostgresScheduleRepository } from '../../src/infrastructure/db/postgres/schedule.repository.impl';
import { PostgresChatRepository } from '../../src/infrastructure/db/postgres/chat.repository.impl';
import { createChatGateway } from '../../src/presentation/websocket/chat.gateway';
import { issueToken } from '../../src/infrastructure/auth/jwt-token.service';

const JWT_SECRET = 'integration-test-secret';

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
}

function waitForClose(ws: WebSocket): Promise<number> {
  return new Promise((resolve) => {
    ws.once('close', (code) => resolve(code));
  });
}

function waitForMessage(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    ws.once('message', (raw) => resolve(JSON.parse(raw.toString())));
  });
}

// BE-8 DoD: 미인증 소켓 차단, 실시간 브로드캐스트, WS로 저장된 메시지가 BE-6과
// 동일한 저장소(ChatRepository)로 조회됨을 실제 서버/DB로 검증한다.
describe('채팅 웹소켓 게이트웨이 (통합)', () => {
  const teamRepository = new PostgresTeamRepository(testPool);
  const scheduleRepository = new PostgresScheduleRepository(testPool);
  const chatRepository = new PostgresChatRepository(testPool);

  let httpServer: HttpServer;
  let baseUrl: string;
  let userId: string;
  let outsiderUserId: string;
  let teamId: string;
  let scheduleId: string;
  let token: string;

  beforeAll(async () => {
    userId = await createTestUser(`be8-gateway-${Date.now()}@example.com`, '통합테스트유저');
    outsiderUserId = await createTestUser(
      `be8-outsider-${Date.now()}@example.com`,
      '외부테스트유저',
    );
    const { team } = await teamRepository.createTeamWithLeader('BE-8 통합테스트팀', userId);
    teamId = team.id;

    const schedule = await scheduleRepository.create({
      teamId,
      title: 'BE-8 통합테스트 일정',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3600_000).toISOString(),
      participantUserIds: [userId],
    });
    scheduleId = schedule.id;
    token = issueToken({ userId, email: 'ignored' }, JWT_SECRET);

    httpServer = createServer();
    createChatGateway(
      httpServer,
      { scheduleRepository, teamRepository, chatRepository },
      JWT_SECRET,
    );
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `ws://127.0.0.1:${port}/ws/chat`;
  });

  afterAll(async () => {
    await teamRepository.deleteTeam(teamId);
    await deleteTestUser(userId);
    await deleteTestUser(outsiderUserId);
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await testPool.end();
  });

  it('토큰 없이 연결하면 즉시 종료된다(4401)', async () => {
    const ws = new WebSocket(baseUrl);
    const code = await waitForClose(ws);
    expect(code).toBe(4401);
  });

  it('유효하지 않은 토큰으로 연결하면 즉시 종료된다(4401)', async () => {
    const ws = new WebSocket(`${baseUrl}?token=invalid`);
    const code = await waitForClose(ws);
    expect(code).toBe(4401);
  });

  it('다른 팀 사용자는 가입하지 않은 일정 채팅을 구독할 수 없다', async () => {
    const outsiderToken = issueToken({ userId: outsiderUserId, email: 'ignored' }, JWT_SECRET);
    const outsider = new WebSocket(`${baseUrl}?token=${outsiderToken}`);
    await waitForOpen(outsider);

    const received = waitForMessage(outsider);
    outsider.send(JSON.stringify({ type: 'join', scheduleId }));

    await expect(received).resolves.toMatchObject({
      type: 'error',
      code: 'FORBIDDEN',
    });
    outsider.close();
  });

  it('메시지 전송 시 같은 일정을 구독한 다른 클라이언트에게 실시간 브로드캐스트되고, 저장된 메시지는 BE-6과 동일한 ChatRepository로 조회된다', async () => {
    const sender = new WebSocket(`${baseUrl}?token=${token}`);
    const listener = new WebSocket(`${baseUrl}?token=${token}`);
    await Promise.all([waitForOpen(sender), waitForOpen(listener)]);

    // 'join'은 서버 쪽에서 findById/findMembership 두 번의 DB 왕복을 거친 뒤에야
    // 실제로 구독이 등록된다(비동기). 이 테스트는 그 완료를 알려주는 ack가 프로토콜에
    // 없으므로, 두 소켓 모두의 구독이 확실히 끝날 시간을 넉넉히 준다 — 짧은 고정
    // 대기(과거 50ms)로는 두 번째 join의 DB 왕복이 끝나기 전에 메시지가 전송되어
    // 리스너가 브로드캐스트를 놓치는 레이스가 실제로 재현되었다(간헐적 타임아웃).
    sender.send(JSON.stringify({ type: 'join', scheduleId }));
    listener.send(JSON.stringify({ type: 'join', scheduleId }));
    await new Promise((resolve) => setTimeout(resolve, 300));

    const received = waitForMessage(listener);
    sender.send(JSON.stringify({ type: 'message', scheduleId, content: 'WS 실시간 메시지' }));

    const broadcast = await received;
    expect(broadcast).toMatchObject({
      type: 'message',
      message: { content: 'WS 실시간 메시지', senderUserId: userId },
    });

    sender.close();
    listener.close();

    // BE-6 REST가 사용하는 것과 동일한 ChatRepository로 조회했을 때도 동일하게 나타난다.
    const chat = await chatRepository.findByScheduleId(scheduleId);
    const history = await chatRepository.listMessages(chat!.id, null, 50);
    expect(history.data.map((m) => m.content)).toContain('WS 실시간 메시지');
  });
});

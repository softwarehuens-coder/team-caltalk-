import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { testPool } from './support/db';
import { createApp } from '../../src/app';
import { PostgresChatRepository } from '../../src/infrastructure/db/postgres/chat.repository.impl';
import {
  registerAndLogin,
  createTeamWithMembers,
  type AuthedUser,
} from './support/scenario-helpers';

// BE-9 DoD: MVP 범위(US-01~US-05, US-07, US-08) 각각에 대응하는 대표 통합/E2E
// 테스트를 최소 1개씩 갖춘다. docs/3-User-scenarios.md의 각 시나리오 흐름을
// 실제 HTTP 앱(createApp) + 실제 DB로 재현한다. SC4(US-06, UC9)는 BE-10 완료
// 후 재확인 대상으로 이번 범위에서 제외한다(이슈 #36 BE-9 DoD 마지막 항목).

const JWT_SECRET = 'us-scenarios-test-secret';

describe('US 시나리오 대표 E2E 테스트 (MVP 범위)', () => {
  let app: Express;
  const teamIdsToCleanup: string[] = [];
  const userIdsToCleanup: string[] = [];

  beforeAll(() => {
    app = createApp(testPool, JWT_SECRET);
  });

  afterAll(async () => {
    for (const teamId of teamIdsToCleanup) {
      await testPool.query('DELETE FROM teams WHERE id = $1', [teamId]);
    }
    for (const userId of userIdsToCleanup) {
      await testPool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await testPool.end();
  });

  function trackUsers(...users: AuthedUser[]) {
    userIdsToCleanup.push(...users.map((u) => u.userId));
  }

  it('US-01: 팀 생성 및 팀원 초대/가입 — 팀장 1명 + 팀원 2명 구성 확인', async () => {
    const leader = await registerAndLogin(app, 'us01-leader', '지훈');
    const member1 = await registerAndLogin(app, 'us01-yeon', '서연');
    const member2 = await registerAndLogin(app, 'us01-min', '민준');
    trackUsers(leader, member1, member2);

    const createTeam = await request(app)
      .post('/teams')
      .set('Authorization', `Bearer ${leader.token}`)
      .send({ name: '디자인팀' });
    expect(createTeam.status).toBe(201);
    const teamId = createTeam.body.id;
    teamIdsToCleanup.push(teamId);

    await request(app)
      .post(`/teams/${teamId}/invite`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({ email: member1.email });
    await request(app)
      .post(`/teams/${teamId}/invite`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({ email: member2.email });

    const join1 = await request(app)
      .post(`/teams/${teamId}/join`)
      .set('Authorization', `Bearer ${member1.token}`);
    const join2 = await request(app)
      .post(`/teams/${teamId}/join`)
      .set('Authorization', `Bearer ${member2.token}`);
    expect(join1.status).toBe(202);
    expect(join2.status).toBe(202);

    const approve1 = await request(app)
      .post(`/teams/join-requests/${join1.body.id}/approve`)
      .set('Authorization', `Bearer ${leader.token}`);
    const approve2 = await request(app)
      .post(`/teams/join-requests/${join2.body.id}/approve`)
      .set('Authorization', `Bearer ${leader.token}`);
    expect(approve1.status).toBe(201);
    expect(approve2.status).toBe(201);

    const members = await request(app)
      .get(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${leader.token}`);
    expect(members.status).toBe(200);
    expect(members.body).toHaveLength(3);
    const roles = Object.fromEntries(
      members.body.map((m: { userId: string; role: string }) => [m.userId, m.role]),
    );
    expect(roles[leader.userId]).toBe('LEADER');
    expect(roles[member1.userId]).toBe('MEMBER');
    expect(roles[member2.userId]).toBe('MEMBER');
  });

  it('US-02: 팀장의 일정 등록과 팀 전체 공유 — 팀원은 조회만 가능, 쓰기는 403', async () => {
    const leader = await registerAndLogin(app, 'us02-leader', '지훈');
    const member = await registerAndLogin(app, 'us02-yeon', '서연');
    trackUsers(leader, member);
    const teamId = await createTeamWithMembers(app, leader, '디자인팀', [member]);
    teamIdsToCleanup.push(teamId);

    const create = await request(app)
      .post(`/teams/${teamId}/schedules`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({
        title: '주간 정기 회의',
        startAt: '2026-09-15T01:00:00.000Z',
        endAt: '2026-09-15T02:00:00.000Z',
        participantUserIds: [leader.userId, member.userId],
      });
    expect(create.status).toBe(201);
    const scheduleId = create.body.schedule.id;

    const memberView = await request(app)
      .get(`/teams/${teamId}/schedules?view=week&date=2026-09-15`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(memberView.status).toBe(200);
    expect(memberView.body.map((s: { id: string }) => s.id)).toContain(scheduleId);

    const memberWriteAttempt = await request(app)
      .put(`/teams/${teamId}/schedules/${scheduleId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        title: '수정 시도',
        startAt: '2026-09-15T01:00:00.000Z',
        endAt: '2026-09-15T02:00:00.000Z',
        participantUserIds: [member.userId],
      });
    expect(memberWriteAttempt.status).toBe(403);
  });

  it('US-03: 캘린더-채팅 연동을 통한 실시간 일정 조율 — 대화는 남지만 일정 시간은 불변', async () => {
    const leader = await registerAndLogin(app, 'us03-leader', '지훈');
    const member = await registerAndLogin(app, 'us03-yeon', '서연');
    trackUsers(leader, member);
    const teamId = await createTeamWithMembers(app, leader, '디자인팀', [member]);
    teamIdsToCleanup.push(teamId);

    const create = await request(app)
      .post(`/teams/${teamId}/schedules`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({
        title: '주간 정기 회의',
        startAt: '2026-09-15T01:00:00.000Z',
        endAt: '2026-09-15T02:00:00.000Z',
        participantUserIds: [leader.userId, member.userId],
      });
    const scheduleId = create.body.schedule.id;

    const chatRepo = new PostgresChatRepository(testPool);
    const chat = await chatRepo.findByScheduleId(scheduleId);
    await chatRepo.createMessage(
      chat!.id,
      member.userId,
      '오후에 다른 미팅이 있어 30분 정도 늦을 수도 있을 것 같습니다',
    );
    await chatRepo.createMessage(chat!.id, leader.userId, '네, 늦으셔도 괜찮습니다');

    const history = await request(app)
      .get(`/schedules/${scheduleId}/messages`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(history.status).toBe(200);
    expect(history.body.data.map((m: { content: string }) => m.content)).toEqual([
      '오후에 다른 미팅이 있어 30분 정도 늦을 수도 있을 것 같습니다',
      '네, 늦으셔도 괜찮습니다',
    ]);

    const scheduleAfter = await request(app)
      .get(`/teams/${teamId}/schedules?view=week&date=2026-09-15`)
      .set('Authorization', `Bearer ${leader.token}`);
    const unchanged = scheduleAfter.body.find((s: { id: string }) => s.id === scheduleId);
    expect(unchanged.startAt).toBe('2026-09-15T01:00:00.000Z');
  });

  it('US-04: 팀원의 변경 요청과 팀장의 승인 — 승인 전 원본 유지, 승인 후 갱신', async () => {
    const leader = await registerAndLogin(app, 'us04-leader', '지훈');
    const member = await registerAndLogin(app, 'us04-yeon', '서연');
    trackUsers(leader, member);
    const teamId = await createTeamWithMembers(app, leader, '디자인팀', [member]);
    teamIdsToCleanup.push(teamId);

    const create = await request(app)
      .post(`/teams/${teamId}/schedules`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({
        title: '주간 정기 회의',
        startAt: '2026-09-15T01:00:00.000Z',
        endAt: '2026-09-15T02:00:00.000Z',
        participantUserIds: [member.userId],
      });
    const scheduleId = create.body.schedule.id;

    const submit = await request(app)
      .post(`/schedules/${scheduleId}/change-requests`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        desiredStartAt: '2026-09-16T01:00:00.000Z',
        desiredEndAt: '2026-09-16T02:00:00.000Z',
        reason: '개인 사정',
      });
    expect(submit.status).toBe(201);
    const changeRequestId = submit.body.id;

    // SC3: 승인 전에는 원본 일정이 그대로 유지되어야 한다.
    const beforeApproval = await request(app)
      .get(`/teams/${teamId}/schedules?view=week&date=2026-09-15`)
      .set('Authorization', `Bearer ${leader.token}`);
    expect(beforeApproval.body.find((s: { id: string }) => s.id === scheduleId).startAt).toBe(
      '2026-09-15T01:00:00.000Z',
    );

    const approve = await request(app)
      .post(`/change-requests/${changeRequestId}/approve`)
      .set('Authorization', `Bearer ${leader.token}`);
    expect(approve.status).toBe(200);
    expect(approve.body.status).toBe('APPROVED');

    const afterApproval = await request(app)
      .get(`/teams/${teamId}/schedules?view=week&date=2026-09-16`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(afterApproval.body.find((s: { id: string }) => s.id === scheduleId).startAt).toBe(
      '2026-09-16T01:00:00.000Z',
    );
  });

  it('US-05: 팀원의 변경 요청 거절과 재요청 — 거절 후 원본 유지, 재요청 승인 후 갱신, 전체 대화 보존', async () => {
    const leader = await registerAndLogin(app, 'us05-leader', '지훈');
    const member = await registerAndLogin(app, 'us05-min', '민준');
    trackUsers(leader, member);
    const teamId = await createTeamWithMembers(app, leader, '디자인팀', [member]);
    teamIdsToCleanup.push(teamId);

    const create = await request(app)
      .post(`/teams/${teamId}/schedules`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({
        title: '프로젝트 리뷰',
        startAt: '2026-09-20T01:00:00.000Z',
        endAt: '2026-09-20T02:00:00.000Z',
        participantUserIds: [member.userId],
      });
    const scheduleId = create.body.schedule.id;

    const submit1 = await request(app)
      .post(`/schedules/${scheduleId}/change-requests`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        desiredStartAt: '2026-09-21T01:00:00.000Z',
        desiredEndAt: '2026-09-21T02:00:00.000Z',
      });

    const reject = await request(app)
      .post(`/change-requests/${submit1.body.id}/reject`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({ reason: '다른 참여자 일정과 겹칩니다' });
    expect(reject.status).toBe(200);
    expect(reject.body.status).toBe('REJECTED');

    const afterReject = await request(app)
      .get(`/teams/${teamId}/schedules?view=week&date=2026-09-20`)
      .set('Authorization', `Bearer ${leader.token}`);
    expect(afterReject.body.find((s: { id: string }) => s.id === scheduleId).startAt).toBe(
      '2026-09-20T01:00:00.000Z',
    );

    const submit2 = await request(app)
      .post(`/schedules/${scheduleId}/change-requests`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        desiredStartAt: '2026-09-22T01:00:00.000Z',
        desiredEndAt: '2026-09-22T02:00:00.000Z',
      });

    const approve = await request(app)
      .post(`/change-requests/${submit2.body.id}/approve`)
      .set('Authorization', `Bearer ${leader.token}`);
    expect(approve.status).toBe(200);

    const afterApprove = await request(app)
      .get(`/teams/${teamId}/schedules?view=week&date=2026-09-22`)
      .set('Authorization', `Bearer ${leader.token}`);
    expect(afterApprove.body.find((s: { id: string }) => s.id === scheduleId).startAt).toBe(
      '2026-09-22T01:00:00.000Z',
    );

    const history = await request(app)
      .get(`/schedules/${scheduleId}/messages`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(history.body.data.map((m: { content: string }) => m.content)).toEqual([
      expect.stringContaining('거절'),
      expect.stringContaining('승인'),
    ]);
  });

  it('US-07: 미인증 접근 차단과 팀원의 읽기 전용 권한', async () => {
    const leader = await registerAndLogin(app, 'us07-leader', '지훈');
    const member = await registerAndLogin(app, 'us07-yeon', '서연');
    trackUsers(leader, member);
    const teamId = await createTeamWithMembers(app, leader, '디자인팀', [member]);
    teamIdsToCleanup.push(teamId);

    const unauthenticated = await request(app).get(
      `/teams/${teamId}/schedules?view=month&date=2026-09-01`,
    );
    expect(unauthenticated.status).toBe(401);

    const create = await request(app)
      .post(`/teams/${teamId}/schedules`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({
        title: '일정',
        startAt: '2026-09-15T01:00:00.000Z',
        endAt: '2026-09-15T02:00:00.000Z',
        participantUserIds: [leader.userId],
      });
    const scheduleId = create.body.schedule.id;

    const memberRead = await request(app)
      .get(`/teams/${teamId}/schedules?view=month&date=2026-09-01`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(memberRead.status).toBe(200);

    const memberDelete = await request(app)
      .delete(`/teams/${teamId}/schedules/${scheduleId}`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(memberDelete.status).toBe(403);
  });

  it('US-08: 과거 일정 채팅 이력을 통한 의사결정 맥락 확인 — 기간 제한 없이 과거 일정/이력 보존', async () => {
    const leader = await registerAndLogin(app, 'us08-leader', '지훈');
    const member = await registerAndLogin(app, 'us08-min', '민준');
    trackUsers(leader, member);
    const teamId = await createTeamWithMembers(app, leader, '디자인팀', [member]);
    teamIdsToCleanup.push(teamId);

    const twoMonthsAgoStart = new Date();
    twoMonthsAgoStart.setMonth(twoMonthsAgoStart.getMonth() - 2);
    const twoMonthsAgoEnd = new Date(twoMonthsAgoStart.getTime() + 3600_000);

    const create = await request(app)
      .post(`/teams/${teamId}/schedules`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({
        title: '1분기 킥오프',
        startAt: twoMonthsAgoStart.toISOString(),
        endAt: twoMonthsAgoEnd.toISOString(),
        participantUserIds: [member.userId],
      });
    const scheduleId = create.body.schedule.id;

    const chatRepo = new PostgresChatRepository(testPool);
    const chat = await chatRepo.findByScheduleId(scheduleId);
    await chatRepo.createMessage(chat!.id, member.userId, '킥오프 관련 논의');
    await chatRepo.createMessage(chat!.id, leader.userId, '승인된 배경 설명');

    const calendarNow = await request(app)
      .get(`/teams/${teamId}/schedules?view=month&date=2026-09-01`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(calendarNow.body.map((s: { id: string }) => s.id)).toContain(scheduleId);

    const history = await request(app)
      .get(`/schedules/${scheduleId}/messages`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(history.status).toBe(200);
    expect(history.body.data.map((m: { content: string }) => m.content)).toEqual([
      '킥오프 관련 논의',
      '승인된 배경 설명',
    ]);
  });

  it('US-06(BE-10 완료 후 재확인): 일정 생성 시 충돌 경고 — 경고가 있어도 저장은 차단되지 않는다(SC4)', async () => {
    const leader = await registerAndLogin(app, 'us06-leader', '지훈');
    const member = await registerAndLogin(app, 'us06-yeon', '서연');
    trackUsers(leader, member);
    const teamId = await createTeamWithMembers(app, leader, '디자인팀', [member]);
    teamIdsToCleanup.push(teamId);

    const existing = await request(app)
      .post(`/teams/${teamId}/schedules`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({
        title: '고객사 미팅',
        startAt: '2026-09-15T14:00:00.000Z',
        endAt: '2026-09-15T15:00:00.000Z',
        participantUserIds: [member.userId],
      });
    expect(existing.body.conflictWarnings).toEqual([]);

    const overlapping = await request(app)
      .post(`/teams/${teamId}/schedules`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({
        title: '내부 워크숍',
        startAt: '2026-09-15T14:30:00.000Z',
        endAt: '2026-09-15T15:30:00.000Z',
        participantUserIds: [member.userId],
      });
    // 경고가 있어도 저장은 정상적으로 완료된다(SC4 — 차단하지 않음).
    expect(overlapping.status).toBe(201);
    expect(overlapping.body.conflictWarnings).toEqual([
      {
        conflictingScheduleId: existing.body.schedule.id,
        conflictingUserId: member.userId,
        conflictingScheduleTitle: '고객사 미팅',
      },
    ]);
    const newScheduleId = overlapping.body.schedule.id;

    const resolved = await request(app)
      .put(`/teams/${teamId}/schedules/${newScheduleId}`)
      .set('Authorization', `Bearer ${leader.token}`)
      .send({
        title: '내부 워크숍',
        startAt: '2026-09-15T15:30:00.000Z',
        endAt: '2026-09-15T16:30:00.000Z',
        participantUserIds: [member.userId],
      });
    expect(resolved.status).toBe(200);
    expect(resolved.body.conflictWarnings).toEqual([]);
  });
});

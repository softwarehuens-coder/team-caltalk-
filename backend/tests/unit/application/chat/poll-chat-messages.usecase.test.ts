import { describe, it, expect, vi } from 'vitest';
import { pollChatMessages } from '../../../../src/application/chat/poll-chat-messages.usecase';
import { NotFoundError, ForbiddenError } from '../../../../src/domain/shared/http-errors';
import { fakeTeamRepository } from '../team/fake-team-repository';
import { fakeScheduleRepository } from '../schedule/fake-schedule-repository';
import { fakeChatRepository } from './fake-chat-repository';

const SCHEDULE = {
  id: 's1',
  teamId: 'team-1',
  title: '일정',
  startAt: '2026-09-09T00:00:00.000Z',
  endAt: '2026-09-09T01:00:00.000Z',
  createdAt: '2026-09-09T00:00:00.000Z',
  deletedAt: null,
  participants: [],
};
const MEMBERSHIP = {
  id: 'm1',
  teamId: 'team-1',
  userId: 'u1',
  role: 'MEMBER' as const,
  createdAt: '2026-09-09T00:00:00.000Z',
};
const CHAT = { id: 'c1', scheduleId: 's1', createdAt: '2026-09-09T00:00:00.000Z' };
const BASE_INPUT = {
  scheduleId: 's1',
  actorUserId: 'u1',
  cursor: null,
  limit: 50,
  // 실제 운영값(1000ms)이 아니라 테스트가 빠르게 끝나도록 짧은 간격/타임아웃을 쓴다.
  pollIntervalMs: 5,
};

describe('pollChatMessages', () => {
  it('일정을 찾을 수 없으면 NotFoundError', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(null) });
    await expect(
      pollChatMessages(scheduleRepo, fakeTeamRepository(), fakeChatRepository(), {
        ...BASE_INPUT,
        timeoutMs: 50,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('팀 비소속이면 ForbiddenError', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({ findMembership: vi.fn().mockResolvedValue(null) });

    await expect(
      pollChatMessages(scheduleRepo, teamRepo, fakeChatRepository(), {
        ...BASE_INPUT,
        timeoutMs: 50,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('채팅을 찾을 수 없으면 NotFoundError', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({ findMembership: vi.fn().mockResolvedValue(MEMBERSHIP) });
    const chatRepo = fakeChatRepository({ findByScheduleId: vi.fn().mockResolvedValue(null) });

    await expect(
      pollChatMessages(scheduleRepo, teamRepo, chatRepo, { ...BASE_INPUT, timeoutMs: 50 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('첫 조회에 새 메시지가 있으면 대기 없이 즉시 반환한다', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({ findMembership: vi.fn().mockResolvedValue(MEMBERSHIP) });
    const page = {
      data: [
        {
          id: 'msg-1',
          chatId: 'c1',
          senderUserId: 'u2',
          content: '안녕',
          createdAt: '2026-09-09T00:00:01.000Z',
        },
      ],
      nextCursor: null,
      hasMore: false,
    };
    const listMessages = vi.fn().mockResolvedValue(page);
    const chatRepo = fakeChatRepository({
      findByScheduleId: vi.fn().mockResolvedValue(CHAT),
      listMessages,
    });

    const result = await pollChatMessages(scheduleRepo, teamRepo, chatRepo, {
      ...BASE_INPUT,
      timeoutMs: 5000,
    });

    expect(result).toEqual(page);
    expect(listMessages).toHaveBeenCalledTimes(1);
  });

  it('처음엔 새 메시지가 없다가 재조회 시점에 생기면 그 시점에 반환한다', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({ findMembership: vi.fn().mockResolvedValue(MEMBERSHIP) });
    const emptyPage = { data: [], nextCursor: null, hasMore: false };
    const page = {
      data: [
        {
          id: 'msg-1',
          chatId: 'c1',
          senderUserId: 'u2',
          content: '늦은 메시지',
          createdAt: '2026-09-09T00:00:01.000Z',
        },
      ],
      nextCursor: null,
      hasMore: false,
    };
    const listMessages = vi
      .fn()
      .mockResolvedValueOnce(emptyPage)
      .mockResolvedValueOnce(emptyPage)
      .mockResolvedValueOnce(page);
    const chatRepo = fakeChatRepository({
      findByScheduleId: vi.fn().mockResolvedValue(CHAT),
      listMessages,
    });

    const result = await pollChatMessages(scheduleRepo, teamRepo, chatRepo, {
      ...BASE_INPUT,
      timeoutMs: 5000,
    });

    expect(result).toEqual(page);
    expect(listMessages).toHaveBeenCalledTimes(3);
  });

  it('타임아웃까지 새 메시지가 없으면 빈 결과를 반환한다(에러 아님)', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({ findMembership: vi.fn().mockResolvedValue(MEMBERSHIP) });
    const emptyPage = { data: [], nextCursor: null, hasMore: false };
    const listMessages = vi.fn().mockResolvedValue(emptyPage);
    const chatRepo = fakeChatRepository({
      findByScheduleId: vi.fn().mockResolvedValue(CHAT),
      listMessages,
    });

    const result = await pollChatMessages(scheduleRepo, teamRepo, chatRepo, {
      ...BASE_INPUT,
      timeoutMs: 20,
    });

    expect(result).toEqual(emptyPage);
    expect(listMessages.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

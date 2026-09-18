import { describe, it, expect, vi } from 'vitest';
import { listChatHistory } from '../../../../src/application/chat/list-chat-history.usecase';
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
  participants: [
    { id: 'p1', scheduleId: 's1', userId: 'u1', createdAt: '2026-09-09T00:00:00.000Z' },
  ],
};

const INPUT = { scheduleId: 's1', actorUserId: 'u1', cursor: null, limit: 50 };

describe('listChatHistory', () => {
  it('일정을 찾을 수 없으면 NotFoundError(팀 해체 등으로 CASCADE 삭제된 경우 포함)', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(null) });

    await expect(
      listChatHistory(scheduleRepo, fakeTeamRepository(), fakeChatRepository(), INPUT),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('팀 비소속(canAccessScheduleChat 실패)이면 ForbiddenError', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({ findMembership: vi.fn().mockResolvedValue(null) });

    await expect(
      listChatHistory(scheduleRepo, teamRepo, fakeChatRepository(), INPUT),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('2026-09-18 정책 변경: 팀원이지만 해당 일정 참여자가 아니면 ForbiddenError', async () => {
    const scheduleWithoutActor = { ...SCHEDULE, participants: [] };
    const scheduleRepo = fakeScheduleRepository({
      findById: vi.fn().mockResolvedValue(scheduleWithoutActor),
    });
    const teamRepo = fakeTeamRepository({
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'MEMBER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });

    await expect(
      listChatHistory(scheduleRepo, teamRepo, fakeChatRepository(), INPUT),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('팀장은 해당 일정 참여자가 아니어도 채팅 이력을 조회할 수 있다', async () => {
    const scheduleWithoutActor = { ...SCHEDULE, participants: [] };
    const scheduleRepo = fakeScheduleRepository({
      findById: vi.fn().mockResolvedValue(scheduleWithoutActor),
    });
    const teamRepo = fakeTeamRepository({
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'LEADER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    const paginated = { data: [], nextCursor: null, hasMore: false };
    const chatRepo = fakeChatRepository({
      findByScheduleId: vi
        .fn()
        .mockResolvedValue({ id: 'c1', scheduleId: 's1', createdAt: '2026-09-09T00:00:00.000Z' }),
      listMessages: vi.fn().mockResolvedValue(paginated),
    });

    const result = await listChatHistory(scheduleRepo, teamRepo, chatRepo, INPUT);

    expect(result).toEqual(paginated);
  });

  it('SC2: 소프트 삭제된 일정이어도 참여자인 팀원이면 채팅 이력을 조회할 수 있다', async () => {
    const deletedSchedule = { ...SCHEDULE, deletedAt: '2026-09-09T05:00:00.000Z' };
    const scheduleRepo = fakeScheduleRepository({
      findById: vi.fn().mockResolvedValue(deletedSchedule),
    });
    const teamRepo = fakeTeamRepository({
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'MEMBER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    const paginated = { data: [], nextCursor: null, hasMore: false };
    const chatRepo = fakeChatRepository({
      findByScheduleId: vi
        .fn()
        .mockResolvedValue({ id: 'c1', scheduleId: 's1', createdAt: '2026-09-09T00:00:00.000Z' }),
      listMessages: vi.fn().mockResolvedValue(paginated),
    });

    const result = await listChatHistory(scheduleRepo, teamRepo, chatRepo, INPUT);

    expect(result).toEqual(paginated);
    expect(chatRepo.listMessages).toHaveBeenCalledWith('c1', null, 50);
  });
});

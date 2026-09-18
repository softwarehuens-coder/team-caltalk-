import { describe, it, expect, vi } from 'vitest';
import { sendChatMessage } from '../../../../src/application/chat/send-chat-message.usecase';
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
  participants: [{ id: 'p1', scheduleId: 's1', userId: 'u1', createdAt: '2026-09-09T00:00:00.000Z' }],
};
const INPUT = { scheduleId: 's1', actorUserId: 'u1', content: '안녕하세요' };

describe('sendChatMessage', () => {
  it('일정을 찾을 수 없으면 NotFoundError', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(null) });
    await expect(
      sendChatMessage(scheduleRepo, fakeTeamRepository(), fakeChatRepository(), INPUT),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('팀 비소속이면 ForbiddenError — REST(BE-6)와 동일한 canAccessScheduleChat 판단을 재사용한다', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({ findMembership: vi.fn().mockResolvedValue(null) });

    await expect(
      sendChatMessage(scheduleRepo, teamRepo, fakeChatRepository(), INPUT),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('2026-09-18 정책 변경: 팀원이지만 해당 일정 참여자가 아니면 ForbiddenError', async () => {
    const scheduleWithoutActor = { ...SCHEDULE, participants: [] };
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(scheduleWithoutActor) });
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
      sendChatMessage(scheduleRepo, teamRepo, fakeChatRepository(), INPUT),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('팀장은 해당 일정 참여자가 아니어도 메시지를 보낼 수 있다', async () => {
    const scheduleWithoutActor = { ...SCHEDULE, participants: [] };
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(scheduleWithoutActor) });
    const teamRepo = fakeTeamRepository({
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'LEADER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    const savedMessage = {
      id: 'msg-1',
      chatId: 'c1',
      senderUserId: 'u1',
      content: '안녕하세요',
      createdAt: '2026-09-09T00:00:00.000Z',
    };
    const chatRepo = fakeChatRepository({
      findByScheduleId: vi
        .fn()
        .mockResolvedValue({ id: 'c1', scheduleId: 's1', createdAt: '2026-09-09T00:00:00.000Z' }),
      createMessage: vi.fn().mockResolvedValue(savedMessage),
    });

    const result = await sendChatMessage(scheduleRepo, teamRepo, chatRepo, INPUT);

    expect(result).toEqual(savedMessage);
  });

  it('참여자인 팀 구성원이면 메시지를 저장하고 반환한다', async () => {
    const scheduleRepo = fakeScheduleRepository({ findById: vi.fn().mockResolvedValue(SCHEDULE) });
    const teamRepo = fakeTeamRepository({
      findMembership: vi.fn().mockResolvedValue({
        id: 'm1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'MEMBER',
        createdAt: '2026-09-09T00:00:00.000Z',
      }),
    });
    const savedMessage = {
      id: 'msg-1',
      chatId: 'c1',
      senderUserId: 'u1',
      content: '안녕하세요',
      createdAt: '2026-09-09T00:00:00.000Z',
    };
    const chatRepo = fakeChatRepository({
      findByScheduleId: vi
        .fn()
        .mockResolvedValue({ id: 'c1', scheduleId: 's1', createdAt: '2026-09-09T00:00:00.000Z' }),
      createMessage: vi.fn().mockResolvedValue(savedMessage),
    });

    const result = await sendChatMessage(scheduleRepo, teamRepo, chatRepo, INPUT);

    expect(result).toEqual(savedMessage);
    expect(chatRepo.createMessage).toHaveBeenCalledWith('c1', 'u1', '안녕하세요');
  });
});

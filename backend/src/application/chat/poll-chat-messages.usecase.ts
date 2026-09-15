import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import type { TeamRepository } from '../../domain/team/team.repository';
import type { ChatRepository } from '../../domain/chat/chat.repository';
import type { PaginatedChatMessages } from '../../domain/chat/chat-message.entity';
import { canAccessTeamChat } from '../../domain/permission/permission.policy';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';

export interface PollChatMessagesInput {
  scheduleId: string;
  actorUserId: string;
  cursor: string | null;
  limit: number;
  timeoutMs: number;
  // 테스트에서만 오버라이드한다(기본 1000ms로 운영 폴링 주기를 유지하면서도
  // 단위 테스트가 실제로 1초씩 기다리지 않게 한다).
  pollIntervalMs?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// UC5를 WebSocket 대신 롱폴링으로 구현한다(Vercel 서버리스 배포 호환 목적, 이슈
// 롱폴링 전환 논의). listChatHistory(UC8)와 동일한 canAccessTeamChat 권한 판단을
// 재사용하고, 새 메시지가 생길 때까지 timeoutMs 동안 chatRepository.listMessages를
// 짧은 간격으로 재호출하다 새 메시지가 있으면 즉시, 없으면 빈 결과로 응답한다 —
// 클라이언트는 응답을 받는 즉시 반환된 커서로 다시 요청하는 방식으로 동작한다.
export async function pollChatMessages(
  scheduleRepository: ScheduleRepository,
  teamRepository: TeamRepository,
  chatRepository: ChatRepository,
  input: PollChatMessagesInput,
): Promise<PaginatedChatMessages> {
  const schedule = await scheduleRepository.findById(input.scheduleId);
  if (!schedule) {
    throw new NotFoundError('SCHEDULE_NOT_FOUND', '일정을 찾을 수 없습니다.');
  }

  const membership = await teamRepository.findMembership(schedule.teamId, input.actorUserId);
  if (!canAccessTeamChat(membership?.role ?? null)) {
    throw new ForbiddenError('FORBIDDEN', '해당 채팅에 접근할 권한이 없습니다.');
  }

  const chat = await chatRepository.findByScheduleId(input.scheduleId);
  if (!chat) {
    throw new NotFoundError('CHAT_NOT_FOUND', '채팅을 찾을 수 없습니다.');
  }

  const pollIntervalMs = input.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const deadline = Date.now() + input.timeoutMs;

  for (;;) {
    const result = await chatRepository.listMessages(chat.id, input.cursor, input.limit);
    if (result.data.length > 0) {
      return result;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return result;
    }
    await sleep(Math.min(pollIntervalMs, remaining));
  }
}

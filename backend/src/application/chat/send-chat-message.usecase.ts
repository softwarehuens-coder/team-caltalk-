import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import type { TeamRepository } from '../../domain/team/team.repository';
import type { ChatRepository } from '../../domain/chat/chat.repository';
import type { ChatMessage } from '../../domain/chat/chat-message.entity';
import { canAccessScheduleChat } from '../../domain/permission/permission.policy';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';

export interface SendChatMessageInput {
  scheduleId: string;
  actorUserId: string;
  content: string;
}

// UC5(REST POST, chat.routes.ts 경유 — 과거 WebSocket chat.gateway.ts에서 롱폴링
// 전환으로 이관됨). list-chat-history.usecase.ts(UC8)와 동일한
// canAccessScheduleChat(permission.policy.ts SSOT)을 그대로 재사용한다.
export async function sendChatMessage(
  scheduleRepository: ScheduleRepository,
  teamRepository: TeamRepository,
  chatRepository: ChatRepository,
  input: SendChatMessageInput,
): Promise<ChatMessage> {
  const schedule = await scheduleRepository.findById(input.scheduleId);
  if (!schedule) {
    throw new NotFoundError('SCHEDULE_NOT_FOUND', '일정을 찾을 수 없습니다.');
  }

  const membership = await teamRepository.findMembership(schedule.teamId, input.actorUserId);
  const isParticipant = schedule.participants.some((p) => p.userId === input.actorUserId);
  if (!canAccessScheduleChat(membership?.role ?? null, isParticipant)) {
    throw new ForbiddenError('FORBIDDEN', '해당 채팅에 접근할 권한이 없습니다.');
  }

  const chat = await chatRepository.findByScheduleId(input.scheduleId);
  if (!chat) {
    throw new NotFoundError('CHAT_NOT_FOUND', '채팅을 찾을 수 없습니다.');
  }

  return chatRepository.createMessage(chat.id, input.actorUserId, input.content);
}

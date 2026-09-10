import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import type { TeamRepository } from '../../domain/team/team.repository';
import type { ChatRepository } from '../../domain/chat/chat.repository';
import type { ChatMessage } from '../../domain/chat/chat-message.entity';
import { canAccessTeamChat } from '../../domain/permission/permission.policy';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';

export interface SendChatMessageInput {
  scheduleId: string;
  actorUserId: string;
  content: string;
}

// UC5(BE-8, chat.gateway.ts 경유). list-chat-history.usecase.ts(BE-6, REST)와 동일한
// canAccessTeamChat(permission.policy.ts SSOT)을 그대로 재사용한다 — 권한 판단을
// WebSocket 쪽에서 재구현하지 않는다(이슈 #34 BE-8 기술적 고려사항).
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
  if (!canAccessTeamChat(membership?.role ?? null)) {
    throw new ForbiddenError('FORBIDDEN', '해당 채팅에 접근할 권한이 없습니다.');
  }

  const chat = await chatRepository.findByScheduleId(input.scheduleId);
  if (!chat) {
    throw new NotFoundError('CHAT_NOT_FOUND', '채팅을 찾을 수 없습니다.');
  }

  return chatRepository.createMessage(chat.id, input.actorUserId, input.content);
}

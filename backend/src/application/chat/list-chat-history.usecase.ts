import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import type { TeamRepository } from '../../domain/team/team.repository';
import type { ChatRepository } from '../../domain/chat/chat.repository';
import type { PaginatedChatMessages } from '../../domain/chat/chat-message.entity';
import { canAccessScheduleChat } from '../../domain/permission/permission.policy';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';

export interface ListChatHistoryInput {
  scheduleId: string;
  actorUserId: string;
  cursor: string | null;
  limit: number;
}

// UC8, SC2. 일정이 소프트 삭제되어도(scheduleRepository.findById가 deleted_at
// 여부를 따지지 않음) 채팅 이력은 계속 조회 가능해야 한다. 팀 해체로 일정 자체가
// CASCADE 삭제된 경우 findById가 null을 반환해 자연스럽게 404가 된다.
export async function listChatHistory(
  scheduleRepository: ScheduleRepository,
  teamRepository: TeamRepository,
  chatRepository: ChatRepository,
  input: ListChatHistoryInput,
): Promise<PaginatedChatMessages> {
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

  return chatRepository.listMessages(chat.id, input.cursor, input.limit);
}

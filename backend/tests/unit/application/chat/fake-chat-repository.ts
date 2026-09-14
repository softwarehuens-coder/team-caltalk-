import { vi } from 'vitest';
import type { ChatRepository } from '../../../../src/domain/chat/chat.repository';

export function fakeChatRepository(overrides: Partial<ChatRepository> = {}): ChatRepository {
  return {
    findByScheduleId: vi.fn(),
    createMessage: vi.fn(),
    listMessages: vi.fn(),
    ...overrides,
  };
}

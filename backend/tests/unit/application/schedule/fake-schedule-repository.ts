import { vi } from 'vitest';
import type { ScheduleRepository } from '../../../../src/domain/schedule/schedule.repository';

export function fakeScheduleRepository(
  overrides: Partial<ScheduleRepository> = {},
): ScheduleRepository {
  return {
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    // 기본값은 빈 배열 — BE-10 충돌 감지(schedule-conflict.ts) 호출 시 다른 일정이
    // 없다고 가정한다. 충돌 시나리오를 테스트하려면 overrides로 명시적으로 채운다.
    listActiveByTeam: vi.fn().mockResolvedValue([]),
    findById: vi.fn(),
    ...overrides,
  };
}

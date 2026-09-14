import { vi } from 'vitest';
import type { ChangeRequestRepository } from '../../../../src/domain/change-request/change-request.repository';

export function fakeChangeRequestRepository(
  overrides: Partial<ChangeRequestRepository> = {},
): ChangeRequestRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    listBySchedule: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

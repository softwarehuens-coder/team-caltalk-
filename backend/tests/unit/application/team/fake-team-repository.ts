import { vi } from 'vitest';
import type { TeamRepository } from '../../../../src/domain/team/team.repository';

// 팀 유스케이스 단위 테스트가 공유하는 최소 모킹 리포지토리. 각 테스트가 필요한
// 메서드만 mockResolvedValue로 덮어써 사용한다.
export function fakeTeamRepository(overrides: Partial<TeamRepository> = {}): TeamRepository {
  return {
    createTeamWithLeader: vi.fn(),
    findById: vi.fn(),
    findMembership: vi.fn(),
    countMembers: vi.fn(),
    addMember: vi.fn(),
    createJoinRequest: vi.fn(),
    findJoinRequest: vi.fn(),
    listPendingJoinRequests: vi.fn(),
    approveJoinRequest: vi.fn(),
    listMembers: vi.fn(),
    removeMember: vi.fn(),
    deleteTeam: vi.fn(),
    transferLeadership: vi.fn(),
    ...overrides,
  };
}

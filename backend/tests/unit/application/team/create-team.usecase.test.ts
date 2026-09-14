import { describe, it, expect, vi } from 'vitest';
import { createTeam } from '../../../../src/application/team/create-team.usecase';
import type { TeamRepository } from '../../../../src/domain/team/team.repository';

describe('createTeam', () => {
  it('팀 생성 시 리포지토리가 생성자를 LEADER로 등록하도록 위임한다', async () => {
    const teamRepository: Partial<TeamRepository> = {
      createTeamWithLeader: vi.fn().mockResolvedValue({
        team: { id: 'team-1', name: '디자인팀', createdAt: '2026-09-09T00:00:00.000Z' },
        membership: {
          id: 'm-1',
          teamId: 'team-1',
          userId: 'user-1',
          role: 'LEADER',
          createdAt: '2026-09-09T00:00:00.000Z',
        },
      }),
    };

    const team = await createTeam(teamRepository as TeamRepository, {
      name: '디자인팀',
      leaderUserId: 'user-1',
    });

    expect(team).toEqual({ id: 'team-1', name: '디자인팀', createdAt: '2026-09-09T00:00:00.000Z' });
    expect(teamRepository.createTeamWithLeader).toHaveBeenCalledWith('디자인팀', 'user-1');
  });
});

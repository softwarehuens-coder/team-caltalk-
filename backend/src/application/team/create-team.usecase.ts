import type { TeamRepository } from '../../domain/team/team.repository';
import type { Team } from '../../domain/team/team.entity';

export interface CreateTeamInput {
  name: string;
  leaderUserId: string;
}

// UC-팀 생성(도메인정의서 5장) — 생성자는 자동으로 LEADER가 된다. 팀 행과 LEADER
// 멤버십 행을 하나의 트랜잭션으로 만들어 "팀은 항상 정확히 1명의 팀장을 가진다"는
// 불변조건이 생성 시점부터 깨지지 않게 한다(리포지토리 구현 참조).
export async function createTeam(
  teamRepository: TeamRepository,
  input: CreateTeamInput,
): Promise<Team> {
  const { team } = await teamRepository.createTeamWithLeader(input.name, input.leaderUserId);
  return team;
}

import type { Team, TeamMembership, TeamMember, TeamJoinRequest } from './team.entity';
import type { TeamRole } from '../permission/permission.policy';

// 인터페이스만 정의(docs/4-project-structure.md 2.2절) — 구현은 infrastructure에 위치.
export interface TeamRepository {
  createTeamWithLeader(
    name: string,
    leaderUserId: string,
  ): Promise<{ team: Team; membership: TeamMembership }>;
  findById(teamId: string): Promise<Team | null>;
  findMembership(teamId: string, userId: string): Promise<TeamMembership | null>;
  countMembers(teamId: string): Promise<number>;
  addMember(teamId: string, userId: string, role: TeamRole): Promise<TeamMembership>;
  createJoinRequest(teamId: string, requesterUserId: string): Promise<TeamJoinRequest>;
  findJoinRequest(joinRequestId: string): Promise<TeamJoinRequest | null>;
  listPendingJoinRequests(teamId: string): Promise<TeamJoinRequest[]>;
  // 승인 상태 전이와 멤버십 생성은 반드시 하나의 트랜잭션에서 처리한다.
  approveJoinRequest(teamId: string, joinRequestId: string): Promise<TeamMembership | null>;
  listMembers(teamId: string): Promise<TeamMember[]>;
  removeMember(teamId: string, userId: string): Promise<void>;
  deleteTeam(teamId: string): Promise<void>;
  // 팀당 정확히 1명의 팀장 불변조건을 단일 트랜잭션으로 보장하며 갱신된 구성원 목록을 반환한다.
  transferLeadership(
    teamId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<TeamMembership[]>;
}

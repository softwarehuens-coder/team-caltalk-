import type { TeamRole } from '../permission/permission.policy';

// teams/team_memberships 테이블 대응(database/schema.sql). swagger.json Team/
// TeamMembership/TeamMember 스키마와 필드명을 맞춘다.

export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  createdAt: string;
}

export type TeamJoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// 팀 가입은 즉시 멤버십을 만들지 않는다. 팀장이 승인할 때만 MEMBER가 된다.
export interface TeamJoinRequest {
  id: string;
  teamId: string;
  requesterUserId: string;
  status: TeamJoinRequestStatus;
  createdAt: string;
  decidedAt: string | null;
}

// GET /teams/{teamId}/members 전용 조인 결과(team_memberships + users).
export interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: TeamRole;
  joinedAt: string;
}

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

// GET /teams/{teamId}/members 전용 조인 결과(team_memberships + users).
export interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: TeamRole;
  joinedAt: string;
}

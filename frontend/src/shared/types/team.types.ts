export type TeamRole = 'LEADER' | 'MEMBER';

export interface Team {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateTeamRequest {
  name: string;
}

export interface InviteTeamMemberRequest {
  email: string;
}

export interface InvitationResponse {
  teamId: string;
  invitedEmail: string;
  invitedAt: string;
}

export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  createdAt: string;
}

export type TeamJoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface TeamJoinRequest {
  id: string;
  teamId: string;
  requesterUserId: string;
  status: TeamJoinRequestStatus;
  createdAt: string;
  decidedAt: string | null;
}

export interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: TeamRole;
  joinedAt: string;
}

export interface DelegateLeaderRequest {
  newLeaderUserId: string;
}

export interface LeaveTeamResponse {
  teamId: string;
  teamDissolved: boolean;
}

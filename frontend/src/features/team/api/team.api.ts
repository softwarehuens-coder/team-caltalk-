import { get, post } from '../../../shared/api/http-client';
import type {
  CreateTeamRequest,
  DelegateLeaderRequest,
  InvitationResponse,
  InviteTeamMemberRequest,
  LeaveTeamResponse,
  Team,
  TeamJoinRequest,
  TeamMember,
  TeamMembership,
} from '../../../shared/types/team.types';

export function createTeam(payload: CreateTeamRequest): Promise<Team> {
  return post<Team>('/teams', payload);
}

export function inviteTeamMember(
  teamId: string,
  payload: InviteTeamMemberRequest,
): Promise<InvitationResponse> {
  return post<InvitationResponse>(`/teams/${teamId}/invite`, payload);
}

export function joinTeam(teamId: string): Promise<TeamJoinRequest> {
  return post<TeamJoinRequest>(`/teams/${teamId}/join`);
}

export function listJoinRequests(teamId: string): Promise<TeamJoinRequest[]> {
  return get<TeamJoinRequest[]>(`/teams/${teamId}/join-requests`);
}

export function approveJoinRequest(requestId: string): Promise<TeamMembership> {
  return post<TeamMembership>(`/teams/join-requests/${requestId}/approve`);
}

export function leaveTeam(teamId: string): Promise<LeaveTeamResponse> {
  return post<LeaveTeamResponse>(`/teams/${teamId}/leave`);
}

export function delegateLeader(
  teamId: string,
  payload: DelegateLeaderRequest,
): Promise<TeamMembership[]> {
  return post<TeamMembership[]>(`/teams/${teamId}/delegate-leader`, payload);
}

export function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  return get<TeamMember[]>(`/teams/${teamId}/members`);
}

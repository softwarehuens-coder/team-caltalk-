import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/api-error';
import type {
  CreateTeamRequest,
  DelegateLeaderRequest,
  InviteTeamMemberRequest,
  LeaveTeamResponse,
  Team,
  TeamJoinRequest,
  TeamMember,
  TeamMembership,
} from '../../../shared/types/team.types';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('../../../shared/api/http-client', () => ({
  get: (...args: unknown[]) => getMock(...args),
  post: (...args: unknown[]) => postMock(...args),
}));

import {
  approveJoinRequest,
  createTeam,
  delegateLeader,
  getTeam,
  getTeamMembers,
  inviteTeamMember,
  joinTeam,
  leaveTeam,
  listJoinRequests,
} from './team.api';

afterEach(() => {
  getMock.mockReset();
  postMock.mockReset();
});

describe('createTeam', () => {
  it('POST /teams 를 올바른 payload로 호출하고 생성된 팀을 반환한다', async () => {
    const payload: CreateTeamRequest = { name: '프론트팀' };
    const team: Team = { id: 't1', name: payload.name, createdAt: '2026-01-01T00:00:00.000Z' };
    postMock.mockResolvedValue(team);

    const result = await createTeam(payload);

    expect(postMock).toHaveBeenCalledWith('/teams', payload);
    expect(result).toEqual(team);
  });

  it('post가 ApiError로 실패하면(400) 그대로 전파한다', async () => {
    const error = new ApiError(400, 'INVALID_TEAM_NAME', '팀 이름은 필수입니다');
    postMock.mockRejectedValue(error);

    await expect(createTeam({ name: '' })).rejects.toBe(error);
  });
});

describe('getTeam', () => {
  it('GET /teams/{teamId} 를 호출하고 팀 정보를 반환한다', async () => {
    const team: Team = { id: 't1', name: '프론트팀', createdAt: '2026-01-01T00:00:00.000Z' };
    getMock.mockResolvedValue(team);

    const result = await getTeam('t1');

    expect(getMock).toHaveBeenCalledWith('/teams/t1');
    expect(result).toEqual(team);
  });

  it('get이 ApiError로 실패하면(403) 그대로 전파한다', async () => {
    const error = new ApiError(403, 'FORBIDDEN', '해당 팀의 구성원만 조회할 수 있습니다');
    getMock.mockRejectedValue(error);

    await expect(getTeam('t1')).rejects.toBe(error);
  });
});

describe('inviteTeamMember', () => {
  it('POST /teams/{teamId}/invite 를 올바른 payload로 호출하고 초대 결과를 반환한다', async () => {
    const payload: InviteTeamMemberRequest = { email: 'invitee@test.com' };
    const response = { teamId: 't1', invitedEmail: payload.email, invitedAt: '2026-01-01T00:00:00.000Z' };
    postMock.mockResolvedValue(response);

    const result = await inviteTeamMember('t1', payload);

    expect(postMock).toHaveBeenCalledWith('/teams/t1/invite', payload);
    expect(result).toEqual(response);
  });

  it('post가 ApiError로 실패하면(403) 그대로 전파한다', async () => {
    const error = new ApiError(403, 'NOT_LEADER', '팀장만 팀원을 초대할 수 있습니다');
    postMock.mockRejectedValue(error);

    await expect(inviteTeamMember('t1', { email: 'invitee@test.com' })).rejects.toBe(error);
  });
});

describe('joinTeam', () => {
  it('POST /teams/{teamId}/join 을 body 없이 호출하고 가입 요청을 반환한다', async () => {
    const joinRequest: TeamJoinRequest = {
      id: 'jr1',
      teamId: 't1',
      requesterUserId: 'u1',
      status: 'PENDING',
      createdAt: '2026-01-01T00:00:00.000Z',
      decidedAt: null,
    };
    postMock.mockResolvedValue(joinRequest);

    const result = await joinTeam('t1');

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock.mock.calls[0][0]).toBe('/teams/t1/join');
    expect(postMock.mock.calls[0][1]).toBeUndefined();
    expect(result).toEqual(joinRequest);
  });

  it('post가 ApiError로 실패하면(404) 그대로 전파한다', async () => {
    const error = new ApiError(404, 'TEAM_NOT_FOUND', '존재하지 않는 팀입니다');
    postMock.mockRejectedValue(error);

    await expect(joinTeam('unknown')).rejects.toBe(error);
  });
});

describe('listJoinRequests', () => {
  it('GET /teams/{teamId}/join-requests 를 호출하고 목록을 반환한다', async () => {
    const requests: TeamJoinRequest[] = [
      {
        id: 'jr1',
        teamId: 't1',
        requesterUserId: 'u2',
        status: 'PENDING',
        createdAt: '2026-01-01T00:00:00.000Z',
        decidedAt: null,
      },
    ];
    getMock.mockResolvedValue(requests);

    const result = await listJoinRequests('t1');

    expect(getMock).toHaveBeenCalledWith('/teams/t1/join-requests');
    expect(result).toEqual(requests);
  });

  it('get이 ApiError로 실패하면(403) 그대로 전파한다', async () => {
    const error = new ApiError(403, 'NOT_LEADER', '팀장만 조회할 수 있습니다');
    getMock.mockRejectedValue(error);

    await expect(listJoinRequests('t1')).rejects.toBe(error);
  });
});

describe('approveJoinRequest', () => {
  it('POST /teams/join-requests/{requestId}/approve 를 body 없이 호출하고 멤버십을 반환한다', async () => {
    const membership: TeamMembership = {
      id: 'm1',
      teamId: 't1',
      userId: 'u2',
      role: 'MEMBER',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    postMock.mockResolvedValue(membership);

    const result = await approveJoinRequest('jr1');

    expect(postMock.mock.calls[0][0]).toBe('/teams/join-requests/jr1/approve');
    expect(postMock.mock.calls[0][1]).toBeUndefined();
    expect(result).toEqual(membership);
  });

  it('post가 ApiError로 실패하면(409) 그대로 전파한다', async () => {
    const error = new ApiError(409, 'JOIN_REQUEST_NOT_PENDING', '이미 처리된 요청입니다');
    postMock.mockRejectedValue(error);

    await expect(approveJoinRequest('jr1')).rejects.toBe(error);
  });
});

describe('leaveTeam', () => {
  it('POST /teams/{teamId}/leave 를 body 없이 호출하고 결과를 반환한다', async () => {
    const response: LeaveTeamResponse = { teamId: 't1', teamDissolved: false };
    postMock.mockResolvedValue(response);

    const result = await leaveTeam('t1');

    expect(postMock.mock.calls[0][0]).toBe('/teams/t1/leave');
    expect(postMock.mock.calls[0][1]).toBeUndefined();
    expect(result).toEqual(response);
  });

  it('post가 ApiError로 실패하면(409) 그대로 전파한다', async () => {
    const error = new ApiError(409, 'LEADER_MUST_DELEGATE', '탈퇴하려면 먼저 팀장을 위임해야 합니다');
    postMock.mockRejectedValue(error);

    await expect(leaveTeam('t1')).rejects.toBe(error);
  });
});

describe('delegateLeader', () => {
  it('POST /teams/{teamId}/delegate-leader 를 올바른 payload로 호출하고 멤버십 목록을 반환한다', async () => {
    const payload: DelegateLeaderRequest = { newLeaderUserId: 'u2' };
    const memberships: TeamMembership[] = [
      { id: 'm1', teamId: 't1', userId: 'u1', role: 'MEMBER', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'm2', teamId: 't1', userId: 'u2', role: 'LEADER', createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    postMock.mockResolvedValue(memberships);

    const result = await delegateLeader('t1', payload);

    expect(postMock).toHaveBeenCalledWith('/teams/t1/delegate-leader', payload);
    expect(result).toEqual(memberships);
  });

  it('post가 ApiError로 실패하면(403) 그대로 전파한다', async () => {
    const error = new ApiError(403, 'NOT_LEADER', '팀장만 위임할 수 있습니다');
    postMock.mockRejectedValue(error);

    await expect(delegateLeader('t1', { newLeaderUserId: 'u2' })).rejects.toBe(error);
  });
});

describe('getTeamMembers', () => {
  it('GET /teams/{teamId}/members 를 호출하고 멤버 목록을 반환한다', async () => {
    const members: TeamMember[] = [
      { userId: 'u1', email: 'leader@test.com', name: '리더', role: 'LEADER', joinedAt: '2026-01-01T00:00:00.000Z' },
    ];
    getMock.mockResolvedValue(members);

    const result = await getTeamMembers('t1');

    expect(getMock).toHaveBeenCalledWith('/teams/t1/members');
    expect(result).toEqual(members);
  });

  it('get이 ApiError로 실패하면(404) 그대로 전파한다', async () => {
    const error = new ApiError(404, 'TEAM_NOT_FOUND', '존재하지 않는 팀입니다');
    getMock.mockRejectedValue(error);

    await expect(getTeamMembers('unknown')).rejects.toBe(error);
  });
});

import type { TeamRepository } from '../../domain/team/team.repository';
import { canInviteTeamMember } from '../../domain/permission/permission.policy';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';

export interface InviteTeamMemberInput {
  teamId: string;
  actorUserId: string;
  invitedEmail: string;
}

export interface InvitationResult {
  teamId: string;
  invitedEmail: string;
  invitedAt: string;
}

// UC-팀원 초대(도메인정의서 5장). swagger.json 설명대로 실제 소속은 영속화하지
// 않고, LEADER만 발신 가능한 초대 확인 응답만 반환한다(canInviteTeamMember SSOT 경유).
export async function inviteTeamMember(
  teamRepository: TeamRepository,
  input: InviteTeamMemberInput,
): Promise<InvitationResult> {
  const team = await teamRepository.findById(input.teamId);
  if (!team) {
    throw new NotFoundError('TEAM_NOT_FOUND', '팀을 찾을 수 없습니다.');
  }

  const actorMembership = await teamRepository.findMembership(input.teamId, input.actorUserId);
  if (!canInviteTeamMember(actorMembership?.role ?? null)) {
    throw new ForbiddenError('FORBIDDEN', '팀원을 초대할 권한이 없습니다.');
  }

  return {
    teamId: input.teamId,
    invitedEmail: input.invitedEmail,
    invitedAt: new Date().toISOString(),
  };
}

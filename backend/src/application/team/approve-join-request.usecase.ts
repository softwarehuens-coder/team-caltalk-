import type { TeamRepository } from '../../domain/team/team.repository';
import type { TeamMembership } from '../../domain/team/team.entity';
import { canApproveTeamJoin } from '../../domain/permission/permission.policy';
import { ConflictError, ForbiddenError, NotFoundError } from '../../domain/shared/http-errors';

export interface ApproveJoinRequestInput {
  joinRequestId: string;
  actorUserId: string;
}

// 요청의 팀을 기준으로 권한을 확인한 뒤, 승인과 MEMBER 생성은 repository 트랜잭션에 맡긴다.
export async function approveJoinRequest(
  teamRepository: TeamRepository,
  input: ApproveJoinRequestInput,
): Promise<TeamMembership> {
  const request = await teamRepository.findJoinRequest(input.joinRequestId);
  if (!request) {
    throw new NotFoundError('JOIN_REQUEST_NOT_FOUND', '가입 요청을 찾을 수 없습니다.');
  }

  const membership = await teamRepository.findMembership(request.teamId, input.actorUserId);
  if (!canApproveTeamJoin(membership?.role ?? null)) {
    throw new ForbiddenError('FORBIDDEN', '가입 요청을 승인할 권한이 없습니다.');
  }

  const approvedMembership = await teamRepository.approveJoinRequest(request.teamId, request.id);
  if (!approvedMembership) {
    throw new ConflictError(
      'JOIN_REQUEST_NOT_PENDING',
      '이미 처리되었거나 유효하지 않은 가입 요청입니다.',
    );
  }

  return approvedMembership;
}

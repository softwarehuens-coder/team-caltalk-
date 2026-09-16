import { useState } from 'react';
import { useAuth } from '../../auth/hooks/use-auth';
import { ApiError } from '../../../shared/api/api-error';
import { delegateLeader } from '../api/team.api';
import type { CurrentTeam } from '../hooks/use-current-team';
import { useTeamMembers } from '../hooks/use-team-members';
import { InviteMemberForm } from './InviteMemberForm';
import { TeamIdCopyButton } from './TeamIdCopyButton';
import { PendingJoinRequestsPanel } from './PendingJoinRequestsPanel';
import { MemberList } from './MemberList';
import { LeaveTeamButton } from './LeaveTeamButton';

export interface TeamDashboardProps {
  team: CurrentTeam;
  onTeamCleared(): void;
}

export function TeamDashboard({ team, onTeamCleared }: TeamDashboardProps) {
  const { user } = useAuth();
  const { members, isLoading, error, refresh } = useTeamMembers(team.id);
  const [delegateError, setDelegateError] = useState<string | null>(null);

  const currentUserId = user?.id ?? '';
  const currentMember = members.find((member) => member.userId === currentUserId);
  const isLeader = currentMember?.role === 'LEADER';

  const handleDelegate = async (userId: string) => {
    setDelegateError(null);

    try {
      await delegateLeader(team.id, { newLeaderUserId: userId });
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDelegateError('팀장 위임 처리 중 충돌이 발생했습니다. 목록을 다시 확인해 주세요.');
      } else {
        setDelegateError('팀장 위임 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
      await refresh();
    }
  };

  if (error && (error.status === 403 || error.status === 404)) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-700">팀 정보를 불러올 수 없습니다. 팀에서 나가주세요.</p>
        <button
          type="button"
          onClick={onTeamCleared}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          팀 나가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold text-gray-900">{team.name}</h1>

      {isLoading && <p className="text-xs text-gray-400">불러오는 중...</p>}

      {isLeader && (
        <>
          <TeamIdCopyButton teamId={team.id} />
          <InviteMemberForm teamId={team.id} />
          <PendingJoinRequestsPanel teamId={team.id} onApproved={refresh} />
        </>
      )}

      {delegateError && <p className="text-xs text-red-500">{delegateError}</p>}

      <MemberList
        members={members}
        currentUserId={currentUserId}
        isLeader={isLeader}
        onDelegate={handleDelegate}
      />

      <LeaveTeamButton
        teamId={team.id}
        isLeader={isLeader}
        memberCount={members.length}
        onLeft={onTeamCleared}
      />
    </div>
  );
}

import { useState } from 'react';
import { ApiError } from '../../../shared/api/api-error';
import type { LeaveTeamResponse } from '../../../shared/types/team.types';
import { leaveTeam } from '../api/team.api';

export interface LeaveTeamButtonProps {
  teamId: string;
  isLeader: boolean;
  memberCount: number;
  onLeft(result: LeaveTeamResponse): void;
}

export function LeaveTeamButton({ teamId, isLeader, memberCount, onLeft }: LeaveTeamButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const mustDelegateFirst = isLeader && memberCount > 1;

  const handleLeave = async () => {
    setError(null);
    setMessage(null);
    setIsLeaving(true);

    try {
      const result = await leaveTeam(teamId);
      setMessage(result.teamDissolved ? '팀이 해체되었습니다' : '팀에서 탈퇴했습니다');
      onLeft(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('탈퇴하려면 먼저 팀장을 위임해야 합니다');
      } else {
        setError('탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {mustDelegateFirst && <p className="text-xs text-gray-400">탈퇴하려면 먼저 팀장을 위임해야 합니다</p>}
      <button
        type="button"
        disabled={isLeaving || mustDelegateFirst}
        onClick={handleLeave}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        팀 나가기
      </button>
      {message && <p className="text-xs text-gray-400">{message}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

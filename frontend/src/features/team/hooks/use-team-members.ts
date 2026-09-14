import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-error';
import type { TeamMember } from '../../../shared/types/team.types';
import { getTeamMembers } from '../api/team.api';

export interface UseTeamMembersResult {
  members: TeamMember[];
  isLoading: boolean;
  error: ApiError | null;
  refresh(): Promise<void>;
}

export function useTeamMembers(teamId: string | null): UseTeamMembersResult {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    if (!teamId) {
      setMembers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getTeamMembers(teamId);
      setMembers(result);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN_ERROR', '팀원 목록을 불러오지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { members, isLoading, error, refresh };
}

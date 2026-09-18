import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/api/api-error';
import type { TeamJoinRequest, TeamMembership } from '../../../shared/types/team.types';
import { approveJoinRequest, listJoinRequests } from '../api/team.api';

export interface UseJoinRequestsResult {
  requests: TeamJoinRequest[];
  isLoading: boolean;
  error: ApiError | null;
  refresh(): Promise<void>;
  approve(requestId: string): Promise<TeamMembership>;
}

export function useJoinRequests(teamId: string | null, enabled: boolean): UseJoinRequestsResult {
  const [requests, setRequests] = useState<TeamJoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    if (!teamId || !enabled) {
      setRequests([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await listJoinRequests(teamId);
      setRequests(result);
    } catch (err) {
      setError(
        err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN_ERROR', '가입 요청 목록을 불러오지 못했습니다.'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [teamId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const approve = useCallback(
    async (requestId: string) => {
      const membership = await approveJoinRequest(requestId);
      await refresh();
      return membership;
    },
    [refresh],
  );

  return { requests, isLoading, error, refresh, approve };
}

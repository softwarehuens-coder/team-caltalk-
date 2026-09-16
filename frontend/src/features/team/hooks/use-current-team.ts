import { useCallback, useEffect, useState } from 'react';

const CURRENT_TEAM_STORAGE_PREFIX = 'team-caltalk:current-team:';

export interface CurrentTeam {
  id: string;
  name: string;
}

export interface UseCurrentTeamResult {
  team: CurrentTeam | null;
  setTeam(team: CurrentTeam): void;
  clearTeam(): void;
}

function readStoredTeam(userId: string): CurrentTeam | null {
  const raw = localStorage.getItem(CURRENT_TEAM_STORAGE_PREFIX + userId);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CurrentTeam;
  } catch {
    return null;
  }
}

// 저장 키에 userId를 포함해 계정별로 분리한다 — 그렇지 않으면 같은 브라우저에서
// 계정을 바꿔 로그인했을 때 이전 계정이 선택해둔 팀(및 그 권한)이 그대로 남아
// 다른 계정에 노출/간섭하는 문제가 생긴다.
export function useCurrentTeam(userId: string | null): UseCurrentTeamResult {
  const [team, setTeamState] = useState<CurrentTeam | null>(null);

  useEffect(() => {
    setTeamState(userId ? readStoredTeam(userId) : null);
  }, [userId]);

  const setTeam = useCallback(
    (nextTeam: CurrentTeam) => {
      if (!userId) {
        return;
      }
      localStorage.setItem(CURRENT_TEAM_STORAGE_PREFIX + userId, JSON.stringify(nextTeam));
      setTeamState(nextTeam);
    },
    [userId],
  );

  const clearTeam = useCallback(() => {
    if (userId) {
      localStorage.removeItem(CURRENT_TEAM_STORAGE_PREFIX + userId);
    }
    setTeamState(null);
  }, [userId]);

  return { team, setTeam, clearTeam };
}

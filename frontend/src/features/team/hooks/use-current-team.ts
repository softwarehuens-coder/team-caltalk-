import { useCallback, useEffect, useState } from 'react';

const CURRENT_TEAM_STORAGE_KEY = 'team-caltalk:current-team';

export interface CurrentTeam {
  id: string;
  name: string;
}

export interface UseCurrentTeamResult {
  team: CurrentTeam | null;
  setTeam(team: CurrentTeam): void;
  clearTeam(): void;
}

function readStoredTeam(): CurrentTeam | null {
  const raw = localStorage.getItem(CURRENT_TEAM_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CurrentTeam;
  } catch {
    return null;
  }
}

export function useCurrentTeam(): UseCurrentTeamResult {
  const [team, setTeamState] = useState<CurrentTeam | null>(null);

  useEffect(() => {
    setTeamState(readStoredTeam());
  }, []);

  const setTeam = useCallback((nextTeam: CurrentTeam) => {
    localStorage.setItem(CURRENT_TEAM_STORAGE_KEY, JSON.stringify(nextTeam));
    setTeamState(nextTeam);
  }, []);

  const clearTeam = useCallback(() => {
    localStorage.removeItem(CURRENT_TEAM_STORAGE_KEY);
    setTeamState(null);
  }, []);

  return { team, setTeam, clearTeam };
}

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../../shared/api/api-error';
import { getTeam, joinTeam } from '../api/team.api';
import type { Team } from '../../../shared/types/team.types';

// 대기 중인 가입 요청이 승인됐는지 재확인하는 주기. 너무 짧으면 팀장이 승인 목록을
// 보는 화면에 불필요한 부하를 주고, 너무 길면 승인 직후에도 한동안 대기 화면에
// 머무는 것처럼 보인다.
const APPROVAL_POLL_INTERVAL_MS = 3000;

export interface JoinTeamFormProps {
  // 가입 요청이 승인된 것을 확인했을 때 호출된다(대기 중 자동 감지, 또는 이미
  // 승인된 멤버가 팀 ID를 다시 입력한 경우 모두 포함) — 승인 후에는 팀 이름을 알
  // 방법이 없어(내 팀 목록 조회 API 없음) 팀 화면에 영구히 진입할 수 없던 문제를
  // 해결하기 위한 콜백이다.
  onJoined?(team: Team): void;
}

export function JoinTeamForm({ onJoined }: JoinTeamFormProps) {
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const onJoinedRef = useRef(onJoined);
  onJoinedRef.current = onJoined;

  // 가입 요청이 PENDING인 동안 승인 여부를 자동으로 재확인한다. 승인되면 팀장의
  // 화면과 별도 조작 없이도 팀원 화면이 곧바로 팀 화면(캘린더)으로 넘어간다 —
  // 그렇지 않으면 팀원이 이 화면에 계속 머물러 승인 사실을 알아채지 못하고,
  // 캘린더/채팅에 진입하지 못하는 문제가 있었다.
  useEffect(() => {
    if (!pendingTeamId) {
      return;
    }

    const checkApproval = async (): Promise<void> => {
      try {
        await joinTeam(pendingTeamId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409 && err.code === 'ALREADY_MEMBER') {
          setPendingTeamId(null);
          try {
            const team = await getTeam(pendingTeamId);
            onJoinedRef.current?.(team);
          } catch {
            setError('이미 가입된 팀이지만 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
          }
        }
        // 그 외 오류(여전히 PENDING 포함)는 다음 주기에 다시 확인한다.
      }
    };

    const timer = setInterval(() => void checkApproval(), APPROVAL_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pendingTeamId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      await joinTeam(teamId);
      setMessage('가입 요청을 보냈습니다. 팀장의 승인을 기다려 주세요.');
      setPendingTeamId(teamId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === 'ALREADY_MEMBER') {
        try {
          const team = await getTeam(teamId);
          onJoined?.(team);
        } catch {
          setError('이미 가입된 팀이지만 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
      } else if (err instanceof ApiError && err.status === 409) {
        setMessage('가입 요청을 보냈습니다. 팀장의 승인을 기다려 주세요.');
        setPendingTeamId(teamId);
      } else if (err instanceof ApiError && err.status === 404) {
        setError('존재하지 않는 팀 ID입니다');
      } else {
        setError('가입 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold text-gray-900">팀 참가하기</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="join-team-id" className="text-sm text-gray-700">
          팀 ID
        </label>
        <input
          id="join-team-id"
          type="text"
          required
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {message && <p className="text-xs text-gray-400">{message}</p>}

      <button
        type="submit"
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        가입 요청
      </button>
    </form>
  );
}

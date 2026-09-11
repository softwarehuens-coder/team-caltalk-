import { useState, type FormEvent } from 'react';
import { ApiError } from '../../../shared/api/api-error';
import { joinTeam } from '../api/team.api';

export function JoinTeamForm() {
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      await joinTeam(teamId);
      setMessage('가입 요청을 보냈습니다. 팀장의 승인을 기다려 주세요.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setMessage('가입 요청을 보냈습니다. 팀장의 승인을 기다려 주세요.');
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

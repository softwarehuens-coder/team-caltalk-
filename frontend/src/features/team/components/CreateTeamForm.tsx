import { useState, type FormEvent } from 'react';
import { ApiError } from '../../../shared/api/api-error';
import type { Team } from '../../../shared/types/team.types';
import { createTeam } from '../api/team.api';

export interface CreateTeamFormProps {
  onCreated(team: Team): void;
}

export function CreateTeamForm({ onCreated }: CreateTeamFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const team = await createTeam({ name });
      setMessage(`${team.name} 팀이 생성되었습니다. 회원님은 팀장입니다.`);
      onCreated(team);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else {
        setError('팀 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold text-gray-900">팀 만들기</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="create-team-name" className="text-sm text-gray-700">
          팀 이름
        </label>
        <input
          id="create-team-name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {message && <p className="text-xs text-gray-400">{message}</p>}

      <button
        type="submit"
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        팀 생성
      </button>
    </form>
  );
}

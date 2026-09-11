import { useState, type FormEvent } from 'react';
import { ApiError } from '../../../shared/api/api-error';
import { inviteTeamMember } from '../api/team.api';

export interface InviteMemberFormProps {
  teamId: string;
}

export function InviteMemberForm({ teamId }: InviteMemberFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const invitation = await inviteTeamMember(teamId, { email });
      setMessage(`${invitation.invitedEmail}로 초대를 보냈습니다`);
      setEmail('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('팀장만 팀원을 초대할 수 있습니다');
      } else {
        setError('초대 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold text-gray-900">팀원 초대</h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="invite-member-email" className="text-sm text-gray-700">
          이메일
        </label>
        <input
          id="invite-member-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {message && <p className="text-xs text-gray-400">{message}</p>}

      <button
        type="submit"
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        초대 보내기
      </button>
    </form>
  );
}

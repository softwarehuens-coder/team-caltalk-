import { Link } from 'react-router-dom';
import { useAuth } from '../../../features/auth/hooks/use-auth';
import { useCurrentTeam } from '../../../features/team/hooks/use-current-team';
import { useTeamMembers } from '../../../features/team/hooks/use-team-members';

export function MyTeamCard() {
  const { user } = useAuth();
  const { team } = useCurrentTeam(user?.id ?? null);
  const { members, isLoading } = useTeamMembers(team?.id ?? null);

  const currentMember = members.find((member) => member.userId === user?.id);

  if (!team) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">내 팀</h2>
        <p className="mt-3 text-sm text-gray-500">
          아직 소속된 팀이 없습니다.{' '}
          <Link to="/team" className="text-primary-600 hover:text-primary-700">
            팀 생성하거나 가입하기
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-gray-900">{team.name}</h2>
        {currentMember && (
          <span className="text-xs text-gray-400">
            가입일 {new Date(currentMember.joinedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {isLoading && <p className="mt-2 text-xs text-gray-400">불러오는 중...</p>}

      <ul className="mt-3 flex flex-col divide-y divide-gray-100">
        {members.map((member) => (
          <li key={member.userId} className="flex items-center justify-between py-2">
            <span className="flex items-center gap-1">
              <span className="text-sm text-gray-700">{member.name}</span>
              {member.userId === user?.id && <span className="text-xs text-gray-400">(나)</span>}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{member.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

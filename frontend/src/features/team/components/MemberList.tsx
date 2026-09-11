import type { TeamMember } from '../../../shared/types/team.types';

export interface MemberListProps {
  members: TeamMember[];
  currentUserId: string;
  isLeader: boolean;
  onDelegate(userId: string): void;
}

export function MemberList({ members, currentUserId, isLeader, onDelegate }: MemberListProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold text-gray-900">팀원 목록</h2>
      <table className="mt-3 w-full text-left">
        <thead>
          <tr>
            <th className="text-xs text-gray-400">이름</th>
            <th className="text-xs text-gray-400">이메일</th>
            <th className="text-xs text-gray-400">역할</th>
            <th className="text-xs text-gray-400">가입일</th>
            <th className="text-xs text-gray-400" />
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.userId}>
              <td className="py-2 text-sm text-gray-700">{member.name}</td>
              <td className="py-2 text-sm text-gray-700">{member.email}</td>
              <td className="py-2">
                <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {member.role}
                </span>
              </td>
              <td className="py-2 text-sm text-gray-700">{new Date(member.joinedAt).toLocaleDateString()}</td>
              <td className="py-2">
                {isLeader && member.userId !== currentUserId && member.role === 'MEMBER' && (
                  <button
                    type="button"
                    onClick={() => onDelegate(member.userId)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    팀장 위임
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

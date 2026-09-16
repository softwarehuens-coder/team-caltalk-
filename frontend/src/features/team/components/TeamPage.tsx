import { useNavigate } from 'react-router-dom';
import { useCurrentTeam } from '../hooks/use-current-team';
import type { Team } from '../../../shared/types/team.types';
import { CreateTeamForm } from './CreateTeamForm';
import { JoinTeamForm } from './JoinTeamForm';
import { TeamDashboard } from './TeamDashboard';

export function TeamPage() {
  const { team, setTeam, clearTeam } = useCurrentTeam();
  const navigate = useNavigate();

  // 가입 요청이 승인되면(자동 감지 또는 재입력) 팀원을 곧바로 캘린더로 보낸다 —
  // 팀장은 팀 생성 직후 이 화면에 남아 팀원 초대/승인을 계속 진행해야 하므로
  // CreateTeamForm 쪽(onCreated)에는 이 이동을 적용하지 않는다.
  const handleJoined = (joinedTeam: Team): void => {
    setTeam(joinedTeam);
    navigate('/');
  };

  if (!team) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-6 p-6">
        <CreateTeamForm onCreated={setTeam} />
        <JoinTeamForm onJoined={handleJoined} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <TeamDashboard team={team} onTeamCleared={clearTeam} />
    </div>
  );
}

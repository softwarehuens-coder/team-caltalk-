import { useCurrentTeam } from '../hooks/use-current-team';
import { CreateTeamForm } from './CreateTeamForm';
import { JoinTeamForm } from './JoinTeamForm';
import { TeamDashboard } from './TeamDashboard';

export function TeamPage() {
  const { team, setTeam, clearTeam } = useCurrentTeam();

  if (!team) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-6 p-6">
        <CreateTeamForm onCreated={setTeam} />
        <JoinTeamForm onJoined={setTeam} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <TeamDashboard team={team} onTeamCleared={clearTeam} />
    </div>
  );
}

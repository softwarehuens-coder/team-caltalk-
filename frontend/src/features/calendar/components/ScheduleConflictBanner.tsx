import type { ScheduleConflictWarning } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';
import { useScheduleConflicts } from '../hooks/use-schedule-conflicts';

export interface ScheduleConflictBannerProps {
  warnings: ScheduleConflictWarning[];
  members: TeamMember[];
}

export function ScheduleConflictBanner({ warnings, members }: ScheduleConflictBannerProps) {
  const { formattedWarnings, hasConflicts } = useScheduleConflicts(warnings, members);

  if (!hasConflicts) {
    return null;
  }

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 mb-4">
      <p className="font-bold text-amber-900 mb-1">⚠️ 일정 충돌 경고 (참고용 — 저장을 막지 않음)</p>
      <ul className="list-disc pl-4 space-y-0.5">
        {formattedWarnings.map((msg, index) => (
          <li key={index}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}

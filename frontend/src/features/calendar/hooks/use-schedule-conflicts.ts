import { useMemo } from 'react';
import type { ScheduleConflictWarning } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';

export function useScheduleConflicts(
  warnings: ScheduleConflictWarning[],
  members: TeamMember[]
) {
  const formattedWarnings = useMemo(() => {
    return warnings.map((w) => {
      const member = members.find((m) => m.userId === w.conflictingUserId);
      const memberName = member ? member.name : '알 수 없는 사용자';
      return `${memberName}님이 참여하는 "${w.conflictingScheduleTitle}" 일정과 시간이 겹칩니다.`;
    });
  }, [warnings, members]);

  return {
    formattedWarnings,
    hasConflicts: warnings.length > 0,
  };
}

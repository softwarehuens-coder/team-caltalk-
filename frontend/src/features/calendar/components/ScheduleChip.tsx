import type { Schedule } from '../../../shared/types/schedule.types';

export interface ScheduleChipProps {
  schedule: Schedule;
  onClick(schedule: Schedule): void;
}

export function ScheduleChip({ schedule, onClick }: ScheduleChipProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(schedule)}
      className="block w-full truncate rounded bg-accent-500 px-2 py-0.5 text-left text-xs font-medium text-white"
      title={schedule.title}
    >
      {schedule.title}
    </button>
  );
}

import type { MouseEvent } from 'react';
import type { Schedule } from '../../../shared/types/schedule.types';

export interface ScheduleChipProps {
  schedule: Schedule;
  onClick(schedule: Schedule): void;
  // 팀장 전용. 지정하면 칩에 연필/삭제 아이콘이 노출되고, 클릭 시 상세+채팅
  // 패널을 거치지 않고 곧바로 해당 동작을 수행한다(요청: 채팅 없이 캘린더에서
  // 바로 수정/삭제하고 싶다).
  onEditClick?(schedule: Schedule): void;
  onDeleteClick?(schedule: Schedule): void;
}

export function ScheduleChip({ schedule, onClick, onEditClick, onDeleteClick }: ScheduleChipProps) {
  const handleEditClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onEditClick?.(schedule);
  };

  const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onDeleteClick?.(schedule);
  };

  return (
    <div className="flex items-center gap-0.5 rounded bg-accent-500 text-white">
      <button
        type="button"
        onClick={() => onClick(schedule)}
        className="block flex-1 truncate px-2 py-0.5 text-left text-xs font-medium"
        title={schedule.title}
      >
        {schedule.title}
      </button>
      {onEditClick && (
        <button
          type="button"
          onClick={handleEditClick}
          aria-label={`${schedule.title} 수정`}
          title="수정"
          className="shrink-0 px-1 text-xs hover:text-primary-200"
        >
          ✎
        </button>
      )}
      {onDeleteClick && (
        <button
          type="button"
          onClick={handleDeleteClick}
          aria-label={`${schedule.title} 삭제`}
          title="삭제"
          className="shrink-0 px-1 pr-2 text-xs hover:text-red-200"
        >
          ✕
        </button>
      )}
    </div>
  );
}

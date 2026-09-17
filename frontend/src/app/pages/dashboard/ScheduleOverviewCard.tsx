import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../features/auth/hooks/use-auth';
import { useTeamSchedules } from '../../../features/calendar/hooks/use-team-schedules';
import { useCurrentTeam } from '../../../features/team/hooks/use-current-team';
import {
  addMonths,
  formatDateParam,
  formatTime,
  getMonthGridDays,
} from '../../../features/calendar/utils/calendar-date.util';
import { groupSchedulesByDay } from '../../../features/calendar/utils/schedule-period.util';
import { MiniCalendar } from './MiniCalendar';

export function ScheduleOverviewCard() {
  const { user } = useAuth();
  const { team } = useCurrentTeam(user?.id ?? null);
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const { schedules, isLoading } = useTeamSchedules(team?.id ?? null, 'month', formatDateParam(anchorDate));

  const schedulesByDay = useMemo(
    () => groupSchedulesByDay(schedules, getMonthGridDays(anchorDate)),
    [schedules, anchorDate],
  );
  const scheduleDates = useMemo(
    () => new Set(Array.from(schedulesByDay.entries()).filter(([, list]) => list.length > 0).map(([key]) => key)),
    [schedulesByDay],
  );
  const selectedSchedules = schedulesByDay.get(formatDateParam(selectedDate)) ?? [];

  const handleToday = (): void => {
    const today = new Date();
    setAnchorDate(today);
    setSelectedDate(today);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">일정</h2>
        <button
          type="button"
          onClick={handleToday}
          className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
        >
          오늘
        </button>
      </div>

      {isLoading && <p className="text-xs text-gray-400">불러오는 중...</p>}

      {!team ? (
        <p className="py-4 text-center text-sm text-gray-500">
          아직 소속된 팀이 없습니다.{' '}
          <Link to="/team" className="text-primary-600 hover:text-primary-700">
            팀 관리로 이동
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="shrink-0 sm:w-64">
            <MiniCalendar
              anchorDate={anchorDate}
              selectedDate={selectedDate}
              scheduleDates={scheduleDates}
              onSelectDate={setSelectedDate}
              onPrevMonth={() => setAnchorDate((current) => addMonths(current, -1))}
              onNextMonth={() => setAnchorDate((current) => addMonths(current, 1))}
            />
          </div>

          <div className="flex flex-1 flex-col gap-2 border-t border-gray-100 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <p className="text-xs text-gray-400">
              {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 일정 {selectedSchedules.length}건
            </p>
            {selectedSchedules.length === 0 ? (
              <p className="py-2 text-sm text-gray-400">이 날짜에 등록된 일정이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {selectedSchedules.map((schedule) => (
                  <li key={schedule.id} className="rounded-md bg-gray-50 px-3 py-2">
                    <p className="truncate text-sm font-medium text-gray-900">{schedule.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatTime(new Date(schedule.startAt))} ~ {formatTime(new Date(schedule.endAt))} · 참여{' '}
                      {schedule.participants.length}명
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

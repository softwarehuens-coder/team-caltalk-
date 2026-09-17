import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../features/auth/hooks/use-auth';
import { useTeamSchedules } from '../../../features/calendar/hooks/use-team-schedules';
import { useCurrentTeam } from '../../../features/team/hooks/use-current-team';
import { useTeamMembers } from '../../../features/team/hooks/use-team-members';
import { addMonths, formatDateParam, formatTime, getMonthGridDays } from '../../../features/calendar/utils/calendar-date.util';
import { groupSchedulesByDay } from '../../../features/calendar/utils/schedule-period.util';
import type { Schedule } from '../../../shared/types/schedule.types';
import { MiniCalendar } from './MiniCalendar';

function formatScheduleDateLabel(schedule: Schedule): string {
  const start = new Date(schedule.startAt);
  const end = new Date(schedule.endAt);
  const startLabel = `${start.getMonth() + 1}월 ${start.getDate()}일`;

  if (formatDateParam(start) === formatDateParam(end)) {
    return startLabel;
  }

  return `${startLabel} ~ ${end.getMonth() + 1}월 ${end.getDate()}일`;
}

export function ScheduleOverviewCard() {
  const { user } = useAuth();
  const { team } = useCurrentTeam(user?.id ?? null);
  const [anchorDate, setAnchorDate] = useState(() => new Date());

  const { schedules, isLoading } = useTeamSchedules(team?.id ?? null, 'month', formatDateParam(anchorDate));
  const { members } = useTeamMembers(team?.id ?? null);

  const nameByUserId = useMemo(() => new Map(members.map((member) => [member.userId, member.name])), [members]);

  const monthSchedules = useMemo(
    () =>
      schedules
        .filter((schedule) => schedule.deletedAt === null)
        .slice()
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [schedules],
  );

  const scheduleDates = useMemo(() => {
    const byDay = groupSchedulesByDay(schedules, getMonthGridDays(anchorDate));
    return new Set(Array.from(byDay.entries()).filter(([, list]) => list.length > 0).map(([key]) => key));
  }, [schedules, anchorDate]);

  const handleToday = (): void => {
    setAnchorDate(new Date());
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
              scheduleDates={scheduleDates}
              onPrevMonth={() => setAnchorDate((current) => addMonths(current, -1))}
              onNextMonth={() => setAnchorDate((current) => addMonths(current, 1))}
            />
          </div>

          <div className="flex flex-1 flex-col gap-2 border-t border-gray-100 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <p className="text-xs text-gray-400">
              {anchorDate.getMonth() + 1}월 일정 {monthSchedules.length}건
            </p>
            {monthSchedules.length === 0 ? (
              <p className="py-2 text-sm text-gray-400">이번 달에 등록된 일정이 없습니다.</p>
            ) : (
              <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {monthSchedules.map((schedule) => {
                  const participantNames = schedule.participants
                    .map((participant) => nameByUserId.get(participant.userId) ?? '알 수 없음')
                    .join(', ');

                  return (
                    <li key={schedule.id} className="rounded-md bg-gray-50 px-3 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium text-gray-900">{schedule.title}</p>
                        <span className="shrink-0 text-xs text-gray-400">{formatScheduleDateLabel(schedule)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatTime(new Date(schedule.startAt))} ~ {formatTime(new Date(schedule.endAt))} · 참여{' '}
                        {schedule.participants.length}명
                        {participantNames && ` (${participantNames})`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/use-auth';
import { useCurrentTeam } from '../../team/hooks/use-current-team';
import { useTeamMembers } from '../../team/hooks/use-team-members';
import type { Schedule } from '../../../shared/types/schedule.types';
import { useCalendarNavigation } from '../hooks/use-calendar-navigation';
import { useTeamSchedules } from '../hooks/use-team-schedules';
import { getMonthGridDays, getWeekDays } from '../utils/calendar-date.util';
import { groupSchedulesByDay } from '../utils/schedule-period.util';
import { AgendaListView } from './AgendaListView';
import { CalendarToolbar } from './CalendarToolbar';
import { MonthGrid } from './MonthGrid';

export interface CalendarViewProps {
  onScheduleClick?(schedule: Schedule): void;
}

export function CalendarView({ onScheduleClick }: CalendarViewProps) {
  const { user, logout } = useAuth();
  const { team } = useCurrentTeam();
  const { members, error: membersError } = useTeamMembers(team?.id ?? null);
  const { view, anchorDate, periodLabel, dateParam, setView, goPrev, goNext, goToday } = useCalendarNavigation();
  const {
    schedules,
    isLoading: isSchedulesLoading,
    error: schedulesError,
  } = useTeamSchedules(team?.id ?? null, view, dateParam);

  const [, setSelectedScheduleId] = useState<string | null>(null);

  const days = useMemo(() => {
    if (view === 'month') {
      return getMonthGridDays(anchorDate);
    }
    if (view === 'week') {
      return getWeekDays(anchorDate);
    }
    return [anchorDate];
  }, [view, anchorDate]);

  const schedulesByDay = useMemo(() => groupSchedulesByDay(schedules, days), [schedules, days]);

  const currentMember = members.find((member) => member.userId === user?.id);
  const isLeader = currentMember?.role === 'LEADER';

  const handleScheduleClick = (schedule: Schedule): void => {
    setSelectedScheduleId(schedule.id);
    onScheduleClick?.(schedule);
  };

  const header = (
    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
      <h1 className="text-lg font-bold text-gray-900">{team ? team.name : 'Team CalTalk'}</h1>
      <div className="flex items-center gap-3">
        <Link to="/team" className="text-sm text-primary-600 hover:text-primary-700">
          팀 관리
        </Link>
        <button
          type="button"
          onClick={logout}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          로그아웃
        </button>
      </div>
    </div>
  );

  if (team === null) {
    return (
      <div className="flex min-h-screen flex-col">
        {header}
        <div className="mx-auto mt-10 w-full max-w-md p-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-700">먼저 팀을 생성하거나 가입해주세요.</p>
            <Link to="/team" className="mt-3 inline-block text-sm text-primary-600 hover:text-primary-700">
              팀 관리로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (schedulesError?.status === 403 || membersError?.status === 403) {
    return (
      <div className="flex min-h-screen flex-col">
        {header}
        <div className="mx-auto mt-10 w-full max-w-md p-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-700">이 팀의 캘린더에 접근할 권한이 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
        <CalendarToolbar
          view={view}
          onViewChange={setView}
          periodLabel={periodLabel}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
          isLeader={isLeader}
        />
        {isSchedulesLoading && <p className="text-xs text-gray-400">불러오는 중...</p>}
        {view === 'month' ? (
          <MonthGrid
            days={days}
            schedulesByDay={schedulesByDay}
            anchorMonth={anchorDate.getMonth()}
            onScheduleClick={handleScheduleClick}
          />
        ) : (
          <AgendaListView days={days} schedulesByDay={schedulesByDay} onScheduleClick={handleScheduleClick} />
        )}
      </div>
    </div>
  );
}

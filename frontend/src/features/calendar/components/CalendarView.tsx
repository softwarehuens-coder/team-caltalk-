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
import { deleteSchedule } from '../api/schedule.api';
import { ScheduleChatPanel } from '../../chat/components/ScheduleChatPanel';
import { AgendaListView } from './AgendaListView';
import { CalendarToolbar } from './CalendarToolbar';
import { MonthGrid } from './MonthGrid';
import { ScheduleForm } from './ScheduleForm';

export interface CalendarViewProps {
  onScheduleClick?(schedule: Schedule): void;
}

export function CalendarView({ onScheduleClick }: CalendarViewProps) {
  const { user, logout } = useAuth();
  const { team } = useCurrentTeam(user?.id ?? null);
  const { members, error: membersError } = useTeamMembers(team?.id ?? null);
  const { view, anchorDate, periodLabel, dateParam, setView, goPrev, goNext, goToday } = useCalendarNavigation();
  const {
    schedules,
    isLoading: isSchedulesLoading,
    error: schedulesError,
    refresh,
  } = useTeamSchedules(team?.id ?? null, view, dateParam);

  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

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
  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId) ?? null;

  const handleScheduleClick = (schedule: Schedule): void => {
    setSelectedScheduleId(schedule.id);
    onScheduleClick?.(schedule);
  };

  const handleEditClick = (schedule: Schedule): void => {
    setFormMode('edit');
    setEditingSchedule(schedule);
  };

  // 캘린더 칩의 (삭제) 아이콘 전용. 상세+채팅 패널이나 수정 폼을 거치지 않고
  // 바로 삭제한다(요청: 채팅 없이 캘린더에서 바로 수정/삭제하고 싶다).
  const handleChipDeleteClick = async (schedule: Schedule): Promise<void> => {
    if (!team || !window.confirm(`"${schedule.title}" 일정을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteSchedule(team.id, schedule.id);
      if (selectedScheduleId === schedule.id) {
        setSelectedScheduleId(null);
      }
      void refresh();
    } catch {
      window.alert('삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleCreateClick = (): void => {
    setFormMode('create');
    setEditingSchedule(null);
  };

  const handleFormSaved = (schedule: Schedule, hasConflicts?: boolean): void => {
    void refresh();
    if (hasConflicts) {
      // 충돌 경고 확인을 위해 폼은 열어두되, 이미 저장된 일정을 대상으로 전환한다.
      // (그렇지 않으면 mode가 'create'로 남아 재저장 시 일정이 중복 생성된다)
      setFormMode('edit');
      setEditingSchedule(schedule);
      return;
    }
    setFormMode(null);
    setEditingSchedule(null);
  };

  const handleFormDeleted = (): void => {
    void refresh();
    setFormMode(null);
    setEditingSchedule(null);
  };

  const handleFormClose = (): void => {
    setFormMode(null);
    setEditingSchedule(null);
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
          onCreateClick={handleCreateClick}
        />
        {isSchedulesLoading && <p className="text-xs text-gray-400">불러오는 중...</p>}
        {view === 'month' ? (
          <MonthGrid
            days={days}
            schedulesByDay={schedulesByDay}
            anchorMonth={anchorDate.getMonth()}
            onScheduleClick={handleScheduleClick}
            onScheduleEditClick={isLeader ? handleEditClick : undefined}
            onScheduleDeleteClick={isLeader ? handleChipDeleteClick : undefined}
          />
        ) : (
          <AgendaListView
            days={days}
            schedulesByDay={schedulesByDay}
            onScheduleClick={handleScheduleClick}
            onScheduleEditClick={isLeader ? handleEditClick : undefined}
            onScheduleDeleteClick={isLeader ? handleChipDeleteClick : undefined}
          />
        )}
      </div>
      {selectedSchedule && (
        <ScheduleChatPanel
          schedule={selectedSchedule}
          members={members}
          isLeader={isLeader}
          onClose={() => setSelectedScheduleId(null)}
          onEditClick={handleEditClick}
          onScheduleApproved={refresh}
        />
      )}
      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <ScheduleForm
              teamId={team.id}
              members={members}
              mode={formMode}
              schedule={editingSchedule}
              onSaved={handleFormSaved}
              onDeleted={handleFormDeleted}
              onCancel={handleFormClose}
            />
          </div>
        </div>
      )}
    </div>
  );
}

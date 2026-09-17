import { useEffect, useState } from 'react';
import { useAuth } from '../../features/auth/hooks/use-auth';
import { formatTime } from '../../features/calendar/utils/calendar-date.util';
import { MyTeamCard } from './dashboard/MyTeamCard';
import { ScheduleOverviewCard } from './dashboard/ScheduleOverviewCard';

const WEEKDAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

function formatGreetingDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${WEEKDAY_NAMES[date.getDay()]}`;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 rounded-full bg-primary-500" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">안녕하세요, {user?.name}님! 👋</h1>
            <p className="mt-1 text-sm text-gray-600">
              오늘은 {formatGreetingDate(now)}이고, 현재 시각은 {formatTime(now)}입니다
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-400">현재 시각</p>
          <p className="text-lg font-bold text-primary-600">{formatTime(now)}</p>
        </div>
      </div>

      <ScheduleOverviewCard />
      <MyTeamCard />
    </div>
  );
}

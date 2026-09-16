import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/use-auth';
import { useCurrentTeam } from '../../features/team/hooks/use-current-team';

// docs/APP_STYLE_GUIDE.md 3.1절 "최상단 네비게이션 바" 마크업을 그대로 구현한다.
const NAV_ITEMS: { to: string; label: string }[] = [
  { to: '/', label: '대시보드' },
  { to: '/team', label: '팀' },
  { to: '/calendar', label: '캘린더' },
];

export function AppHeader() {
  const { user, logout } = useAuth();
  const { team } = useCurrentTeam(user?.id ?? null);
  const { pathname } = useLocation();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <Link to="/" className="text-xl font-bold text-gray-900">
        팀캘톡
      </Link>
      <nav className="flex items-center gap-4 text-sm text-gray-700">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            aria-current={pathname === item.to ? 'page' : undefined}
            className={pathname === item.to ? 'font-semibold text-gray-900' : 'hover:text-gray-900'}
          >
            {item.label}
          </Link>
        ))}
        {team && (
          <span className="rounded-full bg-primary-100 px-3 py-1 font-medium text-primary-700">{team.name}</span>
        )}
        {user && <span className="text-gray-700">{user.name}님</span>}
        <button
          type="button"
          onClick={logout}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          로그아웃
        </button>
      </nav>
    </header>
  );
}

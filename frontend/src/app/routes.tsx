import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthPage } from '../features/auth/components/AuthPage';
import { useAuth } from '../features/auth/hooks/use-auth';
import { TeamPage } from '../features/team/components/TeamPage';
import { RequireAuth } from './providers/RequireAuth';

// FE-3에서 실제 캘린더 화면으로 교체될 임시 홈 플레이스홀더.
function HomePlaceholder() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-lg font-bold text-gray-900">Team CalTalk 홈</h1>
      <Link to="/team" className="text-primary-600 hover:text-primary-700">
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
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePlaceholder />
          </RequireAuth>
        }
      />
      <Route
        path="/team"
        element={
          <RequireAuth>
            <TeamPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthPage } from '../features/auth/components/AuthPage';
import { CalendarView } from '../features/calendar/components/CalendarView';
import { TeamPage } from '../features/team/components/TeamPage';
import { RequireAuth } from './providers/RequireAuth';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <CalendarView />
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

import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthPage } from '../features/auth/components/AuthPage';
import { CalendarView } from '../features/calendar/components/CalendarView';
import { TeamPage } from '../features/team/components/TeamPage';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { RequireAuth } from './providers/RequireAuth';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/team" element={<TeamPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

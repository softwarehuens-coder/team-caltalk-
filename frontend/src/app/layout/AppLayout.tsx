import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <Outlet />
    </div>
  );
}

import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('./AppHeader', () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));

import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  it('AppHeader와 현재 라우트(Outlet)의 내용을 함께 렌더링한다', () => {
    render(
      <MemoryRouter initialEntries={['/child']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/child" element={<div>자식 페이지</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByText('자식 페이지')).toBeInTheDocument();
  });
});

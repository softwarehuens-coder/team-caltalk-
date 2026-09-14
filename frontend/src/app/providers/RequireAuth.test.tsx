import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockUseAuth = vi.fn();

vi.mock('../../features/auth/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

import { RequireAuth } from './RequireAuth';

function protectedTree() {
  return (
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>로그인 페이지</div>} />
        <Route
          path="/protected"
          element={
            <RequireAuth>
              <div>보호된 콘텐츠</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('미인증 상태이면 로그인 화면으로 리다이렉트한다 (US-07)', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      status: 'unauthenticated',
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(protectedTree());

    expect(screen.getByText('로그인 페이지')).toBeInTheDocument();
    expect(screen.queryByText('보호된 콘텐츠')).not.toBeInTheDocument();
  });

  it('인증 상태이면 자식 컴포넌트를 렌더링한다', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'user@test.com', name: '홍길동', createdAt: '2026-01-01T00:00:00.000Z' },
      token: 'token',
      status: 'authenticated',
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(protectedTree());

    expect(screen.getByText('보호된 콘텐츠')).toBeInTheDocument();
  });

  it('인증 상태에서 401로 인해 unauthenticated로 전환되면 로그인 화면으로 자동 리다이렉트된다', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'user@test.com', name: '홍길동', createdAt: '2026-01-01T00:00:00.000Z' },
      token: 'token',
      status: 'authenticated',
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { rerender } = render(protectedTree());
    expect(screen.getByText('보호된 콘텐츠')).toBeInTheDocument();

    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      status: 'unauthenticated',
      login: vi.fn(),
      logout: vi.fn(),
    });

    rerender(protectedTree());

    expect(screen.getByText('로그인 페이지')).toBeInTheDocument();
  });
});

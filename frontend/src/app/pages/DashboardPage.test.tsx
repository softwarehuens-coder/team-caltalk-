import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

const useAuthMock = vi.fn();

vi.mock('../../features/auth/hooks/use-auth', () => ({
  useAuth: () => useAuthMock(),
}));

import { DashboardPage } from './DashboardPage';

afterEach(() => {
  useAuthMock.mockReset();
  vi.useRealTimers();
});

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 9, 6, 14, 17, 0));
  });

  it('로그인한 사용자 이름으로 인사말을 렌더링한다', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1', email: 'user@test.com', name: '원형섭', createdAt: '2026-01-01T00:00:00.000Z' },
    });

    render(<DashboardPage />);

    expect(screen.getByText('안녕하세요, 원형섭님! 👋')).toBeInTheDocument();
  });

  it('오늘 날짜(연/월/일/요일)와 현재 시각을 표시한다', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1', email: 'user@test.com', name: '원형섭', createdAt: '2026-01-01T00:00:00.000Z' },
    });

    render(<DashboardPage />);

    expect(screen.getByText('오늘은 2025년 10월 06일 월요일이고, 현재 시각은 14:17입니다')).toBeInTheDocument();
    expect(screen.getByText('현재 시각')).toBeInTheDocument();
    expect(screen.getByText('14:17')).toBeInTheDocument();
  });

  it('시간이 흐르면 표시된 현재 시각이 갱신된다', () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1', email: 'user@test.com', name: '원형섭', createdAt: '2026-01-01T00:00:00.000Z' },
    });

    render(<DashboardPage />);
    expect(screen.getByText('14:17')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByText('14:18')).toBeInTheDocument();
  });
});

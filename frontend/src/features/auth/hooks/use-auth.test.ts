import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from './use-auth';
import { AuthContext } from '../../../app/providers/auth-context';
import type { AuthContextValue } from '../../../app/providers/auth-context';

describe('useAuth', () => {
  it('AuthProvider 밖에서 호출하면 에러를 던진다', () => {
    expect(() => renderHook(() => useAuth())).toThrow();
  });

  it('AuthProvider 안에서 호출하면 컨텍스트 값을 그대로 반환한다', () => {
    const value: AuthContextValue = {
      user: null,
      token: null,
      status: 'unauthenticated',
      login: vi.fn(),
      logout: vi.fn(),
    };

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => createElement(AuthContext.Provider, { value }, children),
    });

    expect(result.current).toBe(value);
  });
});

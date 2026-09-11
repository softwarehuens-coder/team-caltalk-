import { useEffect, useState, type ReactNode } from 'react';
import { loginUser } from '../../features/auth/api/auth.api';
import { setUnauthorizedHandler } from '../../shared/api/http-client';
import { clearAuthToken, getAuthToken, setAuthToken } from '../../shared/api/token-storage';
import type { LoginRequest, User } from '../../shared/types/auth.types';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('idle');

  useEffect(() => {
    const existingToken = getAuthToken();
    setToken(existingToken);
    setStatus(existingToken ? 'authenticated' : 'unauthenticated');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setToken(null);
      setStatus('unauthenticated');
    });
  }, []);

  const login = async (payload: LoginRequest): Promise<void> => {
    const response = await loginUser(payload);
    setAuthToken(response.token);
    setUser(response.user);
    setToken(response.token);
    setStatus('authenticated');
  };

  const logout = (): void => {
    clearAuthToken();
    setUser(null);
    setToken(null);
    setStatus('unauthenticated');
  };

  const value: AuthContextValue = { user, token, status, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

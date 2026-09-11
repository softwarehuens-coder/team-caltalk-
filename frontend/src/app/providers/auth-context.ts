import { createContext } from 'react';
import type { LoginRequest, User } from '../../shared/types/auth.types';

export type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  status: AuthStatus;
  login(payload: LoginRequest): Promise<void>;
  logout(): void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

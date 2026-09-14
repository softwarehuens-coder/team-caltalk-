import { post } from '../../../shared/api/http-client';
import type { LoginRequest, LoginResponse, RegisterRequest, User } from '../../../shared/types/auth.types';

export function registerUser(payload: RegisterRequest): Promise<User> {
  return post<User>('/auth/register', payload);
}

export function loginUser(payload: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/login', payload);
}

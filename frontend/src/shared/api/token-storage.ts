import type { User } from '../types/auth.types';

const AUTH_TOKEN_STORAGE_KEY = 'team-caltalk:auth-token';
const AUTH_USER_STORAGE_KEY = 'team-caltalk:auth-user';

// localStorage는 같은 브라우저의 모든 탭/창이 공유한다 — 팀장/팀원을 같은
// 브라우저의 여러 탭에서 각각 로그인해 테스트할 때, 한 탭에서 로그인하면 그
// 즉시 다른 탭들의 다음 API 요청도 동일한 토큰으로 인증되어 서로 계정이
// 뒤섞이는 문제가 있었다. sessionStorage는 탭 단위로 격리되므로 탭마다
// 독립된 로그인 세션을 유지할 수 있다(대신 탭을 닫으면 그 세션은 로그아웃됨).
export function getAuthToken(): string | null {
  return sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getAuthUser(): User | null {
  const raw = sessionStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setAuthUser(user: User): void {
  sessionStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthUser(): void {
  sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearAuthToken, clearAuthUser, getAuthToken, getAuthUser, setAuthToken, setAuthUser } from './token-storage';
import type { User } from '../types/auth.types';

const STORAGE_KEY = 'team-caltalk:auth-token';
const USER_STORAGE_KEY = 'team-caltalk:auth-user';

describe('token-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getAuthToken', () => {
    it('저장된 토큰이 없으면 null을 반환한다', () => {
      expect(getAuthToken()).toBeNull();
    });

    it('저장된 토큰이 있으면 해당 값을 반환한다', () => {
      localStorage.setItem(STORAGE_KEY, 'stored-token');
      expect(getAuthToken()).toBe('stored-token');
    });
  });

  describe('setAuthToken', () => {
    it('토큰을 localStorage 지정된 키에 저장한다', () => {
      setAuthToken('new-token');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('new-token');
      expect(getAuthToken()).toBe('new-token');
    });

    it('기존 토큰을 새 토큰으로 덮어쓴다', () => {
      setAuthToken('old-token');
      setAuthToken('overwritten-token');
      expect(getAuthToken()).toBe('overwritten-token');
    });
  });

  describe('clearAuthToken', () => {
    it('저장된 토큰을 제거한다', () => {
      setAuthToken('to-be-removed');
      clearAuthToken();
      expect(getAuthToken()).toBeNull();
    });

    it('토큰이 없는 상태에서 호출해도 에러 없이 동작한다', () => {
      expect(() => clearAuthToken()).not.toThrow();
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('getAuthUser', () => {
    it('저장된 사용자 정보가 없으면 null을 반환한다', () => {
      expect(getAuthUser()).toBeNull();
    });

    it('저장된 사용자 정보가 있으면 파싱하여 반환한다', () => {
      const user: User = { id: 'u1', email: 'user@test.com', name: '홍길동', createdAt: '2026-01-01T00:00:00.000Z' };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

      expect(getAuthUser()).toEqual(user);
    });

    it('저장된 값이 손상된 JSON이면 null을 반환한다', () => {
      localStorage.setItem(USER_STORAGE_KEY, '{invalid-json');

      expect(getAuthUser()).toBeNull();
    });
  });

  describe('setAuthUser', () => {
    it('사용자 정보를 JSON으로 직렬화하여 localStorage 지정된 키에 저장한다', () => {
      const user: User = { id: 'u1', email: 'user@test.com', name: '홍길동', createdAt: '2026-01-01T00:00:00.000Z' };

      setAuthUser(user);

      expect(localStorage.getItem(USER_STORAGE_KEY)).toBe(JSON.stringify(user));
      expect(getAuthUser()).toEqual(user);
    });

    it('기존 사용자 정보를 새 정보로 덮어쓴다', () => {
      const oldUser: User = { id: 'u1', email: 'old@test.com', name: '올드', createdAt: '2026-01-01T00:00:00.000Z' };
      const newUser: User = { id: 'u2', email: 'new@test.com', name: '뉴', createdAt: '2026-01-02T00:00:00.000Z' };

      setAuthUser(oldUser);
      setAuthUser(newUser);

      expect(getAuthUser()).toEqual(newUser);
    });
  });

  describe('clearAuthUser', () => {
    it('저장된 사용자 정보를 제거한다', () => {
      setAuthUser({ id: 'u1', email: 'user@test.com', name: '홍길동', createdAt: '2026-01-01T00:00:00.000Z' });

      clearAuthUser();

      expect(getAuthUser()).toBeNull();
    });

    it('사용자 정보가 없는 상태에서 호출해도 에러 없이 동작한다', () => {
      expect(() => clearAuthUser()).not.toThrow();
      expect(getAuthUser()).toBeNull();
    });
  });
});

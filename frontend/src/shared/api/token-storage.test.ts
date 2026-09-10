import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearAuthToken, getAuthToken, setAuthToken } from './token-storage';

const STORAGE_KEY = 'team-caltalk:auth-token';

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
});

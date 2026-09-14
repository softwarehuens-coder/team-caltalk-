import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCurrentTeam } from './use-current-team';

const STORAGE_KEY = 'team-caltalk:current-team';

describe('useCurrentTeam', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('localStorage에 저장된 값이 없으면 team은 null이다', () => {
    const { result } = renderHook(() => useCurrentTeam());

    expect(result.current.team).toBeNull();
  });

  it('localStorage에 저장된 값이 있으면 마운트 시 해당 값으로 복원한다', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 't1', name: '프론트팀' }));

    const { result } = renderHook(() => useCurrentTeam());

    expect(result.current.team).toEqual({ id: 't1', name: '프론트팀' });
  });

  it('setTeam 호출 시 상태와 localStorage가 함께 갱신된다', () => {
    const { result } = renderHook(() => useCurrentTeam());

    act(() => {
      result.current.setTeam({ id: 't2', name: '백엔드팀' });
    });

    expect(result.current.team).toEqual({ id: 't2', name: '백엔드팀' });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)).toEqual({ id: 't2', name: '백엔드팀' });
  });

  it('clearTeam 호출 시 상태를 null로 만들고 localStorage 값을 제거한다', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 't1', name: '프론트팀' }));
    const { result } = renderHook(() => useCurrentTeam());

    act(() => {
      result.current.clearTeam();
    });

    expect(result.current.team).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

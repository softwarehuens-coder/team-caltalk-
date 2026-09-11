import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useCalendarNavigation } from './use-calendar-navigation';

describe('useCalendarNavigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 15, 9, 0, 0)); // 2026-04-15 수요일
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('초기값은 view=month, anchorDate=오늘이고 periodLabel/dateParam이 오늘 기준으로 계산된다', () => {
    const { result } = renderHook(() => useCalendarNavigation());

    expect(result.current.view).toBe('month');
    expect(result.current.dateParam).toBe('2026-04-15');
    expect(result.current.periodLabel).toBe('2026년 4월');
  });

  it('setView 호출 시 view가 변경되고 periodLabel이 해당 뷰 형식으로 바뀐다', () => {
    const { result } = renderHook(() => useCalendarNavigation());

    act(() => {
      result.current.setView('day');
    });

    expect(result.current.view).toBe('day');
    expect(result.current.periodLabel).toBe('2026년 4월 15일');
  });

  it('month 뷰에서 goNext/goPrev 호출 시 한 달 단위로 anchorDate가 이동한다', () => {
    const { result } = renderHook(() => useCalendarNavigation());

    act(() => {
      result.current.goNext();
    });
    expect(result.current.dateParam).toBe('2026-05-01');

    act(() => {
      result.current.goPrev();
    });
    expect(result.current.dateParam).toBe('2026-04-01');
  });

  it('week 뷰에서 goNext/goPrev 호출 시 7일 단위로 anchorDate가 이동한다', () => {
    const { result } = renderHook(() => useCalendarNavigation());

    act(() => {
      result.current.setView('week');
    });
    act(() => {
      result.current.goNext();
    });
    expect(result.current.dateParam).toBe('2026-04-22');

    act(() => {
      result.current.goPrev();
      result.current.goPrev();
    });
    expect(result.current.dateParam).toBe('2026-04-08');
  });

  it('day 뷰에서 goNext/goPrev 호출 시 하루 단위로 anchorDate가 이동한다', () => {
    const { result } = renderHook(() => useCalendarNavigation());

    act(() => {
      result.current.setView('day');
    });
    act(() => {
      result.current.goNext();
    });
    expect(result.current.dateParam).toBe('2026-04-16');

    act(() => {
      result.current.goPrev();
      result.current.goPrev();
    });
    expect(result.current.dateParam).toBe('2026-04-14');
  });

  it('goToday 호출 시 anchorDate가 오늘로 초기화된다', () => {
    const { result } = renderHook(() => useCalendarNavigation());

    act(() => {
      result.current.goNext();
    });
    expect(result.current.dateParam).not.toBe('2026-04-15');

    act(() => {
      result.current.goToday();
    });
    expect(result.current.dateParam).toBe('2026-04-15');
  });
});

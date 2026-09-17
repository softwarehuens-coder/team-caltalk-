import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDays,
  addMonths,
  formatDateParam,
  formatTime,
  getMonthGridDays,
  getWeekDays,
  isSameDay,
  isToday,
} from './calendar-date.util';

describe('addDays', () => {
  it('n일 만큼 더한 날짜를 반환한다', () => {
    const result = addDays(new Date(2026, 3, 30), 1);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(4);
    expect(result.getDate()).toBe(1);
  });

  it('음수를 전달하면 이전 날짜를 반환한다', () => {
    const result = addDays(new Date(2026, 3, 1), -1);

    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(31);
  });
});

describe('addMonths', () => {
  it('월말 날짜에 더해도 오버플로 없이 다음 달 1일을 반환한다', () => {
    const result = addMonths(new Date(2026, 0, 31), 1);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(1);
  });

  it('음수를 전달하면 이전 달로 이동한다', () => {
    const result = addMonths(new Date(2026, 0, 15), -1);

    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11);
  });
});

describe('getWeekDays', () => {
  it('anchorDate가 속한 주의 일요일부터 토요일까지 7일을 반환한다', () => {
    const days = getWeekDays(new Date(2026, 3, 15)); // 2026-04-15 수요일

    expect(days).toHaveLength(7);
    expect(formatDateParam(days[0])).toBe('2026-04-12');
    expect(formatDateParam(days[6])).toBe('2026-04-18');
  });
});

describe('getMonthGridDays', () => {
  it('6주(42일) 분량의 날짜를 반환하며 이전/다음 달 날짜를 포함한다', () => {
    const days = getMonthGridDays(new Date(2026, 3, 15)); // 2026-04

    expect(days).toHaveLength(42);
    expect(formatDateParam(days[0])).toBe('2026-03-29');
    expect(formatDateParam(days[3])).toBe('2026-04-01');
    expect(formatDateParam(days[41])).toBe('2026-05-09');
  });
});

describe('formatDateParam', () => {
  it('YYYY-MM-DD 형식으로 zero-padding하여 반환한다', () => {
    expect(formatDateParam(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('isSameDay', () => {
  it('연/월/일이 같으면 true를 반환한다(시각이 달라도)', () => {
    expect(isSameDay(new Date(2026, 3, 15, 1, 0), new Date(2026, 3, 15, 23, 0))).toBe(true);
  });

  it('날짜가 다르면 false를 반환한다', () => {
    expect(isSameDay(new Date(2026, 3, 15), new Date(2026, 3, 16))).toBe(false);
  });
});

describe('isToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 15, 9, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('오늘 날짜이면 true를 반환한다', () => {
    expect(isToday(new Date(2026, 3, 15))).toBe(true);
  });

  it('오늘이 아니면 false를 반환한다', () => {
    expect(isToday(new Date(2026, 3, 16))).toBe(false);
  });
});

describe('formatTime', () => {
  it('HH:mm 형식으로 zero-padding하여 반환한다', () => {
    expect(formatTime(new Date(2026, 3, 15, 9, 5))).toBe('09:05');
  });

  it('자정도 00:00으로 표시한다', () => {
    expect(formatTime(new Date(2026, 3, 15, 0, 0))).toBe('00:00');
  });
});

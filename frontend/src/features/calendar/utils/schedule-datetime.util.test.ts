import { describe, expect, it } from 'vitest';
import { toDatetimeLocalInput, toIsoString } from './schedule-datetime.util';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toLocalInputFormat(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

describe('toDatetimeLocalInput', () => {
  it('ISO 8601 문자열을 로컬 시각 기준 YYYY-MM-DDTHH:mm 형식으로 변환한다', () => {
    const date = new Date(2026, 3, 15, 9, 5, 30);
    const iso = date.toISOString();

    expect(toDatetimeLocalInput(iso)).toBe(toLocalInputFormat(date));
  });

  it('분 단위 자리수가 한 자리여도 0으로 패딩한다', () => {
    const date = new Date(2026, 0, 1, 0, 3, 0);
    const iso = date.toISOString();

    expect(toDatetimeLocalInput(iso)).toBe(toLocalInputFormat(date));
  });
});

describe('toIsoString', () => {
  it('로컬 시각 문자열(YYYY-MM-DDTHH:mm)을 ISO 8601 문자열로 변환한다', () => {
    const local = '2026-04-15T09:05';
    const expected = new Date(2026, 3, 15, 9, 5, 0, 0).toISOString();

    expect(toIsoString(local)).toBe(expected);
  });
});

describe('왕복 변환', () => {
  it('toIsoString 후 toDatetimeLocalInput을 적용하면 원본 로컬 문자열과 동일하다', () => {
    const local = '2026-04-15T09:05';

    expect(toDatetimeLocalInput(toIsoString(local))).toBe(local);
  });

  it('toDatetimeLocalInput 후 toIsoString을 적용하면 원본 ISO 시각과 동일하다', () => {
    const date = new Date(2026, 3, 15, 9, 5, 0, 0);
    const iso = date.toISOString();

    expect(toIsoString(toDatetimeLocalInput(iso))).toBe(iso);
  });
});

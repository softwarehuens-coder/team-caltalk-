import { describe, expect, it } from 'vitest';
import { ApiError, isErrorResponse } from './api-error';

describe('isErrorResponse', () => {
  it('code와 message가 모두 문자열이면 true를 반환한다', () => {
    expect(isErrorResponse({ code: 'NOT_FOUND', message: '찾을 수 없습니다' })).toBe(true);
  });

  it('code 필드가 없으면 false를 반환한다', () => {
    expect(isErrorResponse({ message: '메시지만 있음' })).toBe(false);
  });

  it('message 필드가 없으면 false를 반환한다', () => {
    expect(isErrorResponse({ code: 'ONLY_CODE' })).toBe(false);
  });

  it('code가 문자열이 아니면 false를 반환한다', () => {
    expect(isErrorResponse({ code: 123, message: 'msg' })).toBe(false);
  });

  it('message가 문자열이 아니면 false를 반환한다', () => {
    expect(isErrorResponse({ code: 'CODE', message: 456 })).toBe(false);
  });

  it('null이면 false를 반환한다', () => {
    expect(isErrorResponse(null)).toBe(false);
  });

  it('undefined이면 false를 반환한다', () => {
    expect(isErrorResponse(undefined)).toBe(false);
  });

  it('객체가 아닌 값(문자열)이면 false를 반환한다', () => {
    expect(isErrorResponse('plain string')).toBe(false);
  });

  it('빈 객체이면 false를 반환한다', () => {
    expect(isErrorResponse({})).toBe(false);
  });

  it('배열이어도 code/message 조건을 만족하면 true를 반환한다', () => {
    const arrLike: unknown = Object.assign([], { code: 'A', message: 'B' });
    expect(isErrorResponse(arrLike)).toBe(true);
  });
});

describe('ApiError', () => {
  it('status, code, message를 인스턴스 속성으로 저장한다', () => {
    const error = new ApiError(404, 'NOT_FOUND', '리소스를 찾을 수 없습니다');

    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('리소스를 찾을 수 없습니다');
  });

  it('name이 ApiError로 설정된다', () => {
    const error = new ApiError(500, 'INTERNAL_ERROR', '서버 오류');
    expect(error.name).toBe('ApiError');
  });

  it('Error의 인스턴스이기도 하다', () => {
    const error = new ApiError(400, 'BAD_REQUEST', '잘못된 요청');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });
});

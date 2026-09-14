import { describe, it, expect, vi, afterEach } from 'vitest';
import { logger } from '../../../src/infrastructure/logging/logger';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('info/warn은 console.log로, error는 console.error로 기록한다', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.info('서버 시작');
    logger.warn('경고 발생');
    logger.error('오류 발생');

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('타임스탬프/레벨/메시지/메타데이터를 포함한 JSON 한 줄을 출력한다', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('변경 요청 승인', { changeRequestId: 'cr-1', userId: 'u-1' });

    const output = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(output.level).toBe('info');
    expect(output.message).toBe('변경 요청 승인');
    expect(output.meta).toEqual({ changeRequestId: 'cr-1', userId: 'u-1' });
    expect(() => new Date(output.timestamp).toISOString()).not.toThrow();
  });
});

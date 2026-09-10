// 개발 환경(단일 환경, MVP 단계)에 맞춘 최소 로거 — 외부 로깅 라이브러리(winston/pino 등)는
// 오버엔지니어링 회피 원칙(CLAUDE.md, docs/7-execution-plan.md DB-4와 동일한 판단)에 따라 도입하지 않는다.
// docs/4-project-structure.md 5.3절: 오류 로깅과 일반 운영 로깅을 구분하고, 로그에 개인정보/비밀값을 남기지 않는다.

type LogLevel = 'info' | 'warn' | 'error';

export interface LogMeta {
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  const line = JSON.stringify(entry);

  // 오류(error)는 stderr, 일반 운영 로그(info/warn)는 stdout으로 분리한다(5.3절 요구사항).
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(message: string, meta?: LogMeta): void {
    write('info', message, meta);
  },
  warn(message: string, meta?: LogMeta): void {
    write('warn', message, meta);
  },
  error(message: string, meta?: LogMeta): void {
    write('error', message, meta);
  },
};

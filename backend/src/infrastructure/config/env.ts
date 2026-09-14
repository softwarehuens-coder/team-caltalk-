import 'dotenv/config';

// 환경변수 로딩/검증을 이 한 곳에서 처리한다(docs/4-project-structure.md 5.1절) —
// 필수 값이 없으면 여기서 기동을 실패시켜 잘못된 설정으로 부분 기동되는 상황을 막는다.

export interface EnvConfig {
  postgresConnectionString: string;
  port: number;
  jwtSecret: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`필수 환경변수 ${name}가 설정되지 않았습니다.`);
  }
  return value;
}

export function loadEnv(): EnvConfig {
  return {
    postgresConnectionString: requireEnv('POSTGRES_CONNECTION_STRING'),
    port: Number(process.env.PORT ?? 3001),
    jwtSecret: requireEnv('JWT_SECRET'),
  };
}

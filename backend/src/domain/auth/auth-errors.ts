// UC1 인증 흐름에서 발생하는 도메인 오류. 프레젠테이션 계층이 이 타입으로
// 분기해 HTTP 상태 코드(409/401)를 결정한다(swagger.json /auth/register,
// /auth/login 계약).

export class EmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`이미 등록된 이메일입니다: ${email}`);
    this.name = 'EmailAlreadyExistsError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('이메일 또는 비밀번호가 일치하지 않습니다.');
    this.name = 'InvalidCredentialsError';
  }
}

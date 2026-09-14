// 여러 도메인(team/schedule/chat/change-request)에서 공통으로 필요한 HTTP 상태 매핑용
// 오류 타입. 각 도메인이 개별 오류 클래스를 중복 정의하지 않도록 여기 한 곳에 둔다
// (오버엔지니어링 금지 — BE-2의 EmailAlreadyExistsError처럼 메시지가 고정된 특수
// 케이스는 그대로 두되, 이후 도메인은 이 셋을 재사용한다).

export class NotFoundError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

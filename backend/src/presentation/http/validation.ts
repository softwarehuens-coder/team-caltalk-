const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 모든 테이블이 UUID PK를 쓰므로(CLAUDE.md), UUID 형태가 아닌 경로 파라미터는 DB까지
// 가지 않고 여기서 400으로 막는다 — pg가 "invalid input syntax for type uuid"를
// 던지면 각 라우트의 respondToDomainError가 모르는 오류라 그대로 500으로 새어나간다.
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

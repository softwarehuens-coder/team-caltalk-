// users 테이블 대응(database/schema.sql). swagger.json의 User 스키마와
// 필드명을 맞춘다(3.2 용어표 — 도메인 문서와 코드 드리프트 방지).

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// 리포지토리 계층에서만 다루는 내부 표현. password_hash는 이 타입을 벗어나
// User로 변환될 때 절대 포함되지 않는다.
export interface UserRecord extends User {
  passwordHash: string;
}

# 프론트엔드-백엔드 통합 가이드

## 1. 개요

이 문서는 **실제로 구현이 완료된 백엔드**(`backend/`, Node.js + TypeScript + Express, BE-1~BE-9)와
**아직 존재하지 않는 프론트엔드**(`frontend/`)를 정확히 통합하기 위한 실무 레퍼런스다. 대상 독자는
프론트엔드(FE-0~FE-9)를 구현하는 사람/에이전트다.

이 문서는 `backend/src`의 실제 코드를 직접 읽고 작성했다. `swagger/swagger.json`(API 계약 SSOT)과
코드가 어긋나는 지점을 발견하면 9장에 명시한다 — 발견되지 않았다면 두 문서는 일치하는 것이다.

## 2. 로컬 개발 환경 구성

```bash
# 1) DB 스키마 적용 (PostgreSQL 인스턴스 필요, pgcrypto 확장은 schema.sql이 직접 생성)
psql -d <database> -f database/schema.sql
# 선택: 개발용 시드 데이터
psql -d <database> -f database/seed.sql

# 2) 백엔드 실행
cd backend
npm install
cp .env.example .env   # POSTGRES_CONNECTION_STRING / JWT_SECRET을 로컬 값으로 수정
npm run dev             # tsx watch src/server.ts
```

- 기본 포트: **3001** (`.env`의 `PORT`, 미설정 시 3001)
- 헬스체크: `GET http://localhost:3001/health`
- Swagger UI: `http://localhost:3001/docs` — `backend/src/app.ts`가 `swagger/swagger.json`을 직접 읽어
  서빙하므로 실제 서버와 계약 문서가 항상 같은 소스를 가리킨다.
- 필수 환경변수(`backend/.env.example` 기준): `POSTGRES_CONNECTION_STRING`(필수), `PORT`(선택, 기본 3001),
  `JWT_SECRET`(필수).

## 3. 알려진 이슈 (프론트엔드 개발 시작 전 확인)

### CORS 미들웨어 없음

`backend/src/app.ts`에는 CORS 설정이 전혀 없다(`cors` 패키지가 `package.json` 의존성에도 없음). 프론트엔드
Vite 개발 서버(기본 5173)에서 백엔드(3001)를 직접 `fetch`/WebSocket 연결하면 브라우저가 CORS 정책으로
요청을 차단한다.

**임시 해결책 (프론트엔드 쪽, 이 저장소 범위)**: Vite dev server의 프록시 기능으로 우회한다.

```ts
// frontend/vite.config.ts (FE-0에서 작성)
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        rewrite: (path) => path.replace(/^\/ws/, '/ws'),
      },
    },
  },
});
```

프론트엔드 API 클라이언트는 `http://localhost:3001` 대신 상대 경로(`/api/...`)로 호출하도록 구성한다.

**근본 해결책 (백엔드 쪽, 이 가이드에서는 수정하지 않음)**: `backend/src/app.ts`에 `cors` 미들웨어 추가가
필요하다. 이는 별도 백엔드 작업으로 남겨야 한다(이 문서/태스크의 범위 밖).

## 4. 인증 흐름 (UC1, FE-1 연결)

1. `POST /auth/register` — `{ email, name, password(8자 이상) }` → 201 `User`(`password_hash` 노출 안 됨).
2. `POST /auth/login` — `{ email, password }` → 200 `{ token, user }`. `token`은 HS256 JWT, 만료 24시간
   (`backend/src/infrastructure/auth/jwt-token.service.ts`).
3. 프론트는 토큰을 저장(예: 메모리 + `localStorage`)하고, 이후 모든 요청에
   `Authorization: Bearer <token>` 헤더를 첨부한다.
4. `GET /health`, `POST /auth/register`, `POST /auth/login`을 제외한 모든 REST 엔드포인트는
   `createAuthMiddleware`(`backend/src/presentation/http/middlewares/auth.middleware.ts`)를 통과해야 한다.
   - `Authorization` 헤더 없음/`Bearer ` 형식 아님 → 401 `{code:"UNAUTHORIZED", message:"인증이 필요합니다."}`
   - 토큰 검증 실패(만료 포함) → 401 `{code:"UNAUTHORIZED", message:"유효하지 않은 토큰입니다."}`
5. 프론트는 401 응답 시 저장된 토큰을 폐기하고 로그인 화면으로 라우트 가드를 되돌려야 한다
   (`docs/4-project-structure.md`의 `app/routes.tsx` 라우트 가드).

## 5. REST API 요약

실제 마운트 순서(`backend/src/app.ts`): 인증 불필요 라우트(`health`, `auth`) → Swagger UI → 인증 미들웨어
→ 인증 필요 라우트(`team`, `schedule`, `chat`, `change-request`).

| 경로 | 메서드 | 인증 | 설명 | 관련 FE 태스크 |
|---|---|---|---|---|
| `/health` | GET | 불필요 | 서버/DB 상태 확인 | - |
| `/auth/register` | POST | 불필요 | 회원가입 | FE-1 |
| `/auth/login` | POST | 불필요 | 로그인, 토큰 발급 | FE-1 |
| `/teams` | POST | 필요 | 팀 생성(생성자가 자동 LEADER) | FE-2 |
| `/teams/{teamId}/invite` | POST | 필요(LEADER) | 이메일로 초대 발신 확인 응답만 반환 — **팀 소속을 즉시 부여하지 않음** | FE-2 |
| `/teams/{teamId}/join` | POST | 필요 | 팀 가입 **요청** 생성, 상태 `PENDING`(즉시 MEMBER 아님) | FE-2 |
| `/teams/join-requests/{requestId}/approve` | POST | 필요(LEADER) | `PENDING` 가입 요청을 승인하고 `MEMBER` 멤버십 생성(단일 트랜잭션) | FE-2 |
| `/teams/{teamId}/join-requests` | GET | 필요(LEADER) | 대기 중(`PENDING`) 가입 요청 목록 조회 | FE-2 |
| `/teams/{teamId}/leave` | POST | 필요 | 팀 탈퇴. 위임 없는 유일 팀장 탈퇴 시도는 409, 유일 구성원 탈퇴 시 팀 해체(`teamDissolved:true`) | FE-2 |
| `/teams/{teamId}/delegate-leader` | POST | 필요(LEADER) | 팀장 위임(영구, 회수 불가) | FE-2 |
| `/teams/{teamId}/members` | GET | 필요 | 팀 구성원 목록(이메일/이름/역할 포함) | FE-2, FE-3 |
| `/teams/{teamId}/schedules` | GET | 필요 | 팀 일정 조회. `view`(month/week/day)·`date` 쿼리 필수(형식 검증에만 사용, 결과 필터링 안 함) | FE-3 |
| `/teams/{teamId}/schedules` | POST | 필요(LEADER) | 일정 생성. 응답에 `conflictWarnings`(UC9/SC4) 포함, 경고 있어도 저장은 차단 안 됨 | FE-4 |
| `/teams/{teamId}/schedules/{id}` | PUT | 필요(LEADER) | 일정 수정 | FE-4 |
| `/teams/{teamId}/schedules/{id}` | DELETE | 필요(LEADER) | 일정 소프트 삭제(`deleted_at`만 갱신, 204) | FE-4 |
| `/schedules/{scheduleId}/messages` | GET | 필요 | 채팅 이력 커서 페이지네이션 조회(REST, UC8) — 실시간 송수신은 WebSocket 전용(7장) | FE-6 |
| `/schedules/{scheduleId}/change-requests` | POST | 필요(MEMBER, 참여자만) | 변경 요청 제출(`status=PENDING`) | FE-7 |
| `/change-requests/{id}/approve` | POST | 필요(LEADER) | 변경 요청 승인, `schedules` 갱신과 단일 트랜잭션(SC3) | FE-8 |
| `/change-requests/{id}/reject` | POST | 필요(LEADER) | 변경 요청 거절(`reason` 필수) | FE-8 |

### 팀 가입/승인 흐름 (변경됨 — 즉시 가입 아님)

`database/schema.sql`이 v1.5로 개정되며 `team_join_requests` 테이블이 추가됐고, 가입 플로우는 다음과 같다.

1. 사용자가 `POST /teams/{teamId}/join` 호출 → `TeamJoinRequest`(`status:"PENDING"`) 생성, 202 응답.
   이미 멤버이면 409(`ALREADY_MEMBER`).
2. 팀장이 `GET /teams/{teamId}/join-requests`로 대기 목록을 조회.
3. 팀장이 `POST /teams/join-requests/{requestId}/approve` 호출 → 이때 비로소 `TeamMembership`(role=`MEMBER`)이
   생성됨. 이미 처리된 요청이면 409(`JOIN_REQUEST_NOT_PENDING`).

FE-2 구현 시 "가입 신청 → 팀장 승인 대기 화면"과 "팀장용 대기 목록 + 승인 버튼" UI가 모두 필요하며,
가입 신청 직후 바로 캘린더/채팅에 접근 가능한 것으로 가정하면 안 된다(승인 전에는 `team_memberships`가 없음).

## 6. 공통 에러 응답 형식

모든 에러 응답은 `{ code: string, message: string }` 형태(`backend/src/presentation/http/error-mapper.ts`,
`respondToDomainError`)이며, 처리되지 않은 예외는 Express 기본 500으로 흐른다.

| 상태 코드 | 의미 | 발생 지점 |
|---|---|---|
| 400 | 요청 형식 오류(`INVALID_REQUEST`) — 필수 필드 누락/타입 불일치 | 각 라우트의 자체 검증 |
| 401 | 미인증(`UNAUTHORIZED`) 또는 로그인 실패(`INVALID_CREDENTIALS`) | `auth.middleware.ts`, `auth.routes.ts` |
| 403 | 권한 없음(`FORBIDDEN`) | `domain/permission/permission.policy.ts` 판정 실패 시 `ForbiddenError` |
| 404 | 리소스 없음 | `NotFoundError`(예: `TEAM_NOT_FOUND`, `SCHEDULE_NOT_FOUND`, `JOIN_REQUEST_NOT_FOUND`) |
| 409 | 상태 충돌 | `ConflictError`(예: `ALREADY_MEMBER`, `JOIN_REQUEST_NOT_PENDING`, 유일 팀장 탈퇴 시도, 이미 결정된 변경요청) |

## 7. WebSocket 채팅 연동 (UC5, FE-5)

- **연결 URL**: `ws://<host>:<port>/ws/chat?token=<JWT>` — 토큰은 **쿼리 파라미터**로 전달한다(헤더 아님).
  `backend/src/presentation/websocket/chat.gateway.ts`가 `WebSocketServer({ server, path: '/ws/chat' })`로
  마운트되어 있다.
- **인증 실패**: 토큰 누락/무효 시 서버가 핸드셰이크 직후 close code **4401**로 연결을 닫는다
  (`ws-auth.guard.ts`의 `verifySocketToken`).
- **메시지 단위 재검증**: 연결 이후에도 메시지를 받을 때마다 토큰을 다시 검증한다. 연결 중 토큰이
  만료되면 그 시점에 소켓이 4401로 닫힌다 — 프론트는 close 이벤트를 감지해 재로그인 또는 토큰 재발급 후
  재연결을 유도해야 한다.
- **클라이언트 → 서버 커맨드**:
  - 구독: `{"type":"join","scheduleId":"<uuid>"}` — 팀 소속 권한(`canAccessTeamChat`)이 없으면 서버가
    `{"type":"error", code, message}`를 보내고 구독을 거부한다. 소켓당 한 번에 하나의 `scheduleId`만
    구독되며, 재`join` 시 이전 구독은 자동 해제된다.
  - 전송: `{"type":"message","scheduleId":"<uuid>","content":"..."}`
- **서버 → 클라이언트**:
  - 브로드캐스트: `{"type":"message","message":<ChatMessage>}` — 해당 `scheduleId`를 구독 중인 소켓에게만
    전송된다.
  - 에러: `{"type":"error","code":"...","message":"..."}`
- **REST 이력 조회와의 역할 분리**: 과거 메시지 페이지네이션 조회는 `GET /schedules/{scheduleId}/messages`
  (REST, UC8, FE-6)만 담당한다. WebSocket 게이트웨이는 실시간 송수신만 처리하며 이력 조회 기능이 없다.
  FE-5는 화면 진입 시 REST로 초기 이력을 불러온 뒤, WebSocket으로 `join` 커맨드를 보내 실시간 갱신을
  구독하는 방식으로 구현한다(FE-6 완료조건: "이력 조회 결과와 FE-5 실시간 메시지가 하나의 목록에서
  시간순 표시").
- **재연결 권장사항**: 명세된 자동 재연결 로직은 없다(서버가 구현을 강제하지 않음) — 프론트에서 close
  이벤트 발생 시 지수 백오프 재연결 + 재연결 성공 시 현재 보고 있는 `scheduleId`로 재`join`을 구현해야
  한다. 4401로 닫힌 경우는 재연결 전에 토큰을 갱신(재로그인)해야 한다.

## 8. 필드 네이밍 매핑

- DB(`database/schema.sql`)는 `snake_case`(예: `team_id`, `start_at`, `deleted_at`).
- REST/WebSocket JSON 바디는 항상 `camelCase`(예: `teamId`, `startAt`, `deletedAt`).
- 매핑은 백엔드 인프라 계층(`infrastructure/db/postgres/*.repository.impl.ts`)의 책임이며, 프론트는
  camelCase만 다루면 된다(`swagger/swagger.json` `info.description` 규약과 동일).

## 9. 발견된 문서-코드 불일치

`backend/src/presentation/http/routes/*.ts` 전체를 `swagger/swagger.json`과 대조한 결과, 엔드포인트
경로/메서드/상태코드/요청·응답 스키마는 실제 코드와 일치했다(최근 커밋 `d8005e2 Sync swagger.json with
the completed backend implementation`이 반영된 상태).

다만 다음 한 가지는 참고용으로 짚어둔다 — 코드 동작에는 영향 없는 **문서 내부 참조 버전 표기 차이**다.

- `swagger/swagger.json`의 `info.description`은 근거 문서로 "`database/schema.sql (v1.3)`"을 인용하고
  있으나, 실제 `database/schema.sql` 상단 변경 이력은 v1.5(`team_join_requests` 도입)까지 진행되어 있다.
  API 계약 자체(엔드포인트/필드)는 이미 v1.5 기준(가입 요청/승인 플로우)으로 구현·반영되어 있으므로 동작에
  영향은 없으나, 주석의 버전 인용 텍스트만 갱신되지 않은 상태다. 별도 승인 없이 이 문서에서 직접 고치지
  않았다.

## 10. 참고 문서

- `docs/4-project-structure.md` (6.1절 프론트엔드 디렉토리 구조, 5.2절 인증 미들웨어 경계)
- `docs/7-execution-plan.md` (4장 FE-0~FE-9 태스크, 6장 백엔드→프론트 의존성 표)
- `swagger/swagger.json` (API 계약 SSOT, `/docs`에서 실서버 기준으로 확인 가능)
- `backend/.env.example` (필수 환경변수)
- `database/schema.sql` (v1.5, 데이터 모델 SSOT)

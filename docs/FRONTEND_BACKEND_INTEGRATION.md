# 프론트엔드-백엔드 통합 가이드

## 1. 개요

> **[2026-09-16 갱신]** 이 문서는 원래 프론트엔드(FE-0~FE-9) 구현 착수 시점에 작성된 레퍼런스다.
> 현재는 `backend/`(Node.js + TypeScript + Express, BE-1~BE-10)와 `frontend/`(Vite + React +
> TypeScript, FE-0~FE-9) 모두 구현·테스트 완료 상태이며(`docs/7-execution-plan.md` 참조), 이 문서는
> 이제 "신규 구현 가이드"가 아니라 **두 계층이 실제로 어떻게 맞물려 있는지 확인하는 통합 레퍼런스**로
> 기능한다. 아래 각 절은 여전히 실제 코드와 합치하도록 유지·갱신하고 있다.

이 문서는 **백엔드**(`backend/`, Node.js + TypeScript + Express)와 **프론트엔드**(`frontend/`, Vite +
React + TypeScript)를 정확히 통합하기 위한 실무 레퍼런스다.

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
Vite 개발 서버(기본 5173)에서 백엔드(3001)를 직접 `fetch` 호출하면 브라우저가 CORS 정책으로 요청을
차단한다.

**임시 해결책 (프론트엔드 쪽, 이 저장소 범위)**: Vite dev server의 프록시 기능으로 우회한다.

```ts
// frontend/vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

프론트엔드 API 클라이언트는 `http://localhost:3001` 대신 상대 경로(`/api/...`)로 호출하도록 구성한다.
실시간 채팅(7장)도 v1.2부터 REST 롱폴링이라 별도 프록시 규칙이 필요 없다 — `/api` 프록시 하나로 충분하다.

**근본 해결책 (백엔드 쪽, 이 가이드에서는 수정하지 않음)**: `backend/src/app.ts`에 `cors` 미들웨어 추가가
필요하다. 특히 **프론트엔드와 백엔드를 별개의 Vercel 프로젝트(서로 다른 도메인)로 배포하는 경우, 이 Vite
dev proxy 우회책은 프로덕션에서 전혀 적용되지 않으므로 CORS 미들웨어 추가가 필수**가 된다. 이는 별도
백엔드 작업으로 남겨야 한다(이 문서/태스크의 범위 밖).

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
| `/schedules/{scheduleId}/messages` | GET | 필요 | 채팅 이력 커서 페이지네이션 조회(UC8) | FE-6 |
| `/schedules/{scheduleId}/messages` | POST | 필요 | 채팅 메시지 전송(UC5 실시간 송신, 7장) | FE-5 |
| `/schedules/{scheduleId}/messages/poll` | GET | 필요 | 채팅 메시지 롱폴링 수신(UC5 실시간 수신, 7장) | FE-5 |
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

**(2026-09-16 추가) 승인 감지 및 팀 이름 조회**: "내 팀 목록 조회" API가 없어(단일 팀 컨텍스트 설계,
`docs/7-execution-plan.md` 7장) 승인 이후 프론트가 팀 이름을 얻을 방법이 `GET /teams/{teamId}`(재입력한
팀 ID로 조회) 뿐이다. `JoinTeamForm.tsx`는 대기 중인 동안 3초 간격으로 1번 엔드포인트를 재호출해
409(`ALREADY_MEMBER`)로 전환되는 시점을 감지하고, 감지 즉시 `GET /teams/{teamId}`로 이름을 받아와
자동으로 캘린더 화면으로 이동한다 — 사용자가 팀 ID를 수동으로 다시 입력할 필요가 없다.

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

## 7. 채팅 실시간 송수신 (UC5, FE-5) — REST 롱폴링

> **[v1.2, 2026-09-14] WebSocket에서 전환됨.** 최초 설계는 이 절에서 WebSocket(`ws://.../ws/chat`)을
> 사용했으나, 백엔드를 Vercel 서버리스 함수로 배포하기로 하면서 상시 연결이 필요한 WebSocket을 유지할 수
> 없다는 제약이 드러나 REST 롱폴링으로 전환했다. `chat.gateway.ts`/`ws-broadcaster.ts`/`ws-auth.guard.ts`는
> 삭제되었다. 배경은 `docs/4-project-structure.md` 5.4절 참조.

일반 REST 인증(4장)과 완전히 동일하게 `Authorization: Bearer <token>` 헤더로 인증한다 — 별도의 핸드셰이크나
쿼리 파라미터 토큰 전달이 없다.

- **전송**: `POST /schedules/{scheduleId}/messages`, 바디 `{"content":"..."}` → 201로 저장된 `ChatMessage`를
  그대로 반환한다. 팀 비소속(`canAccessTeamChat` 미통과)이면 403, 일정/채팅을 찾을 수 없으면 404.
  (`send-chat-message.usecase.ts`, `list-chat-history.usecase.ts`와 동일한 권한 판단 재사용.)
- **수신(롱폴링)**: `GET /schedules/{scheduleId}/messages/poll?cursor=<createdAt>&timeout=<ms>` — `cursor`
  이후 새 메시지가 생길 때까지 서버가 최대 `timeout`(ms, 기본/상한 25000)만큼 응답을 들고 있다가, 새 메시지가
  생기면 즉시, 없으면 `timeout` 경과 후 `{ data: [], nextCursor: null, hasMore: false }`로 응답한다
  (`poll-chat-messages.usecase.ts`). `cursor` 생략 시 채팅의 첫 메시지부터 조회한다.
- **클라이언트 루프**: 응답을 받는 즉시 반환된 `data`의 마지막 메시지 `createdAt`을 다음 `cursor`로 삼아 곧바로
  다시 요청한다(무한 반복) — `frontend/src/features/chat/hooks/use-chat-polling.ts`가 이 루프와 실패 시
  지수 백오프 재시도(초기 1초, 최대 30초)를 구현한다.
- **초기 연결 시나리오**: 화면 진입 시 REST 이력 조회(`GET /schedules/{scheduleId}/messages`, cursor 없이)로
  현재까지의 메시지를 먼저 불러오고, 그 마지막 메시지의 `createdAt`을 첫 폴링 요청의 `cursor`로 사용한다.
  이력이 없으면(`messages.length === 0`) `cursor` 없이 폴링을 시작한다.
- **인증 만료**: 폴링/전송 요청이 401을 받으면 일반 REST와 동일하게 처리된다(6장) — 프론트는 저장된 토큰을
  폐기하고 재로그인을 유도하며, 더 이상 재시도하지 않는다.
- **정밀도 한계(수정됨, 2026-09-16)**: 한때 `cursor`로 쓰는 `createdAt`이 밀리초 정밀도(`Date.toISOString()`)
  였는데 DB 저장값은 마이크로초 정밀도라, 기준으로 삼은 메시지 자신이 절삭 오차만큼 다음 폴링에 다시
  걸리는 문제가 있었다(DB-6에 문서화된 것과 같은 종류의 정밀도 한계). 클라이언트가 메시지 `id`로 중복은
  제거하지만, 문제는 화면 중복이 아니라 **응답을 받는 즉시 재요청하는 폴링 루프가 지연 없이 무한 반복되어
  서버에 초당 100회 이상 요청이 몰리는 것**이었다(브라우저 실측 확인). `chat.repository.impl.ts`의
  `toChatMessage()`가 페이지네이션 `nextCursor`와 동일하게 마이크로초 정밀도 `cursor_value`를
  `createdAt`에도 사용하도록 통일해 해결했다 — 현재는 이 문제가 재발하지 않는다
  (`docs/7-execution-plan.md` 8장 참조).
- **REST 이력 조회와의 관계**: 세 엔드포인트(이력 조회/폴링 수신/전송) 모두 동일한 `ChatRepository` 구현체를
  공유하므로, 전송된 메시지는 즉시 이력 조회로도 동일하게 나타난다(저장소 일치).

## 8. 필드 네이밍 매핑

- DB(`database/schema.sql`)는 `snake_case`(예: `team_id`, `start_at`, `deleted_at`).
- REST JSON 바디는 항상 `camelCase`(예: `teamId`, `startAt`, `deletedAt`).
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

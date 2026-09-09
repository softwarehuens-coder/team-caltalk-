# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 반드시 지켜야 할 사항

- 오버엔지니어링 금지
- 모든 처리 결과에 대한 설명은 한국어로

## 프로젝트 현황

**Team CalTalk**은 팀 캘린더 + 채팅 애플리케이션으로, 현재 설계/명세 단계에 있습니다. 프론트엔드(`frontend/`)와 백엔드(`backend/`) 애플리케이션 소스는 아직 존재하지 않으며, 설계 문서(`docs/`), 데이터베이스 스키마(`database/schema.sql`), API 계약(`swagger/swagger.json`), 목업 API 서버(`mockup/`)만 있습니다. 작업 분해(DB/백엔드/프론트엔드 트랙별 태스크, 의존성, 완료 조건)는 `docs/7-execution-plan.md`에 있습니다. 기능 구현을 요청받으면 임의로 계획을 세우기 전에 먼저 이 파일에서 해당 태스크를 확인하세요.

## 명령어

아직 애플리케이션 빌드/린트/테스트 도구는 없습니다(`frontend/`, `backend/` 프로젝트 자체가 없음). 현재 실행 가능한 것:

**목업 API 서버** (`mockup/`) — `swagger/swagger.json`을 읽어 REST API 목업(`openapi-mock-express-middleware`)과 Swagger UI(`swagger-ui-express`)를 제공:
```
cd mockup
node server.js        # 또는: npx nodemon server.js (자동 재시작)
```
목업 API: `http://localhost:3000/api`. Swagger UI: `http://localhost:3000/docs`.

**데이터베이스 스키마 적용**: `database/schema.sql`은 단일 DDL 파일이며(정식 마이그레이션 프레임워크 도입은 `docs/7-execution-plan.md`의 DB-4에서 의도적으로 보류됨 — ORM 미확정, 오버엔지니어링 회피), PostgreSQL 인스턴스에 직접 적용:
```
psql -d <database> -f database/schema.sql
```
파일 자체가 `pgcrypto` 확장을 생성한다. 모든 테이블은 `UUID DEFAULT gen_random_uuid()` 기본 키를 사용한다.

## 문서 기반 아키텍처

`docs/` 디렉토리는 번호가 매겨진 설계 문서 체인이며, 각 문서는 특정 관심사의 단일 진실 공급원(SSOT)임을 스스로 선언한다. 뒤에 오는 문서는 앞 문서를 절 번호로 인용한다 — 설계 결정이 바뀌면 그 결정을 소유한 문서를 먼저 갱신하고, 의존하는 문서에 드리프트가 없는지 확인해야 한다:

| 문서 | 소유 범위 |
|---|---|
| `1-domain-definition.md` | 도메인 용어집, 액터/권한, 팀 라이프사이클, 성공 기준(SC1-SC4) — 도메인 규칙 SSOT |
| `2-PRD.md` | 제품 범위, MoSCoW 우선순위(Must=MVP, Should=후속), 유스케이스별 사용자 스토리(UC1-UC9) |
| `3-User-scenarios.md` | UC들을 엮은 구체적 엔드투엔드 시나리오(US-01~US-08) |
| `4-project-structure.md` | 확정 기술 스택, 백엔드 4계층 아키텍처, 네이밍 규칙, 프론트/백엔드 디렉토리 구조 |
| `5-arch-diagram.md` | 단순화된 시스템 다이어그램(클라이언트/백엔드/DB, REST vs WebSocket 구분) |
| `6-tech-stack.md` | 트레이드오프 분석을 포함한 스택 결정 기록 |
| `7-execution-plan.md` | DB/백엔드/프론트엔드 트랙별 태스크 분해, 의존성 및 완료조건(DoD) 체크박스 |
| `8-wireframes.md` | 화면별 저해상도 ASCII 와이어프레임(구조만, 비주얼 디자인 없음) |

데이터 모델의 실질적 근거는 `database/schema.sql`(DDL)이고, API 계약의 실질적 근거는 `swagger/swagger.json`(OpenAPI 3.0.3)이다 — 엔티티나 엔드포인트를 변경할 때는 이 두 파일을 직접 갱신하고 서로 어긋나지 않는지 확인할 것. `docs/7-execution-plan.md`의 태스크 설명에 등장하는 엔드포인트/필드명 서술은 swagger.json과 동기화되어 있어야 하는 참고 자료다.

## 예정된 애플리케이션 아키텍처 (`4-project-structure.md` 기준)

아직 구현되지 않았지만, 구현 시 반드시 따라야 하는 구조:

- **백엔드** (Node.js + TypeScript + Express): 엄격한 4계층 아키텍처 — `presentation`(HTTP 라우트 + WebSocket 게이트웨이) → `application`(유스케이스 오케스트레이션) → `domain`(엔티티, 규칙, 리포지토리 인터페이스) → `infrastructure`(Postgres 리포지토리 구현체, WebSocket 전송). 의존성은 항상 안쪽(도메인 방향)으로만 향한다. `domain`은 `infrastructure`나 `presentation`을 import해서는 안 된다.
- **권한 검사는 중앙화**: 모든 인가 로직은 단 하나의 `domain/permission/permission.policy.ts`에만 존재한다 — 다른 계층이 역할 검사를 재구현해서는 안 된다.
- **채팅은 REST/WebSocket으로 분리**: `chat.routes.ts`(REST)는 페이지네이션된 이력 조회(UC8, `swagger/swagger.json`의 `GET /schedules/{scheduleId}/messages`)만 담당하고, `chat.gateway.ts`(WebSocket)는 실시간 송수신(UC5)만 담당한다 — 이 둘을 하나의 경로로 합치지 말 것. 실시간 송수신은 swagger.json 범위 밖이다.
- **프론트엔드** (Vite 기반 React 18 + TypeScript SPA — `6-tech-stack.md`의 후속 결정에 따라 의도적으로 Next.js 미사용): `src/features/{auth,team,calendar,chat}` 아래 기능 기반 구조, 여러 기능이 공유하는 컴포넌트/훅/타입/API 클라이언트는 `src/shared/`에 배치.

## 구현을 제약하는 도메인 불변조건

`1-domain-definition.md`에서 나온 규칙으로, 단순 외래 키만으로는 강제할 수 없다 — 모든 백엔드 로직이 명시적으로 지켜야 한다:

- 팀은 항상 리더를 **정확히 1명** 가진다(`team_memberships`에는 팀당 `LEADER`를 *최대* 1명으로 제한하는 부분 유니크 인덱스가 있음 — `uq_team_memberships_one_leader_per_team`. *최소* 1명 보장은 팀 생성/위임/해체 흐름에서 트랜잭션으로 강제해야 한다).
- 일정 삭제는 **소프트 삭제**(`schedules.deleted_at`)이며, 절대 채팅 이력에 캐스케이드되어서는 안 된다. 채팅/메시지/변경요청은 오직 *팀*이 해체될 때만(`schedules`를 통해 캐스케이드되는 실제 `DELETE FROM teams`) 하드 삭제된다.
- 변경 요청의 승인은 `change_requests.status`와 대상 `schedules` 행(`start_at`/`end_at`을 `desired_start_at`/`desired_end_at`으로)을 **하나의 트랜잭션 안에서** 갱신해야 한다 — 일정은 `APPROVED`가 아닌 요청을 절대 반영해서는 안 된다.

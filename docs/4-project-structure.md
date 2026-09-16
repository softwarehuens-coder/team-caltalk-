# Team CalTalk 프로젝트 구조 설계 원칙

## 문서 정보

| 항목 | 내용 |
|---|---|
| 버전 | v1.3 |
| 작성일 | 2026-09-07 |
| 최종수정일 | 2026-09-16 |
| 작성자 | Team CalTalk 아키텍처 리뷰 |
| 근거 문서 | [1-domain-definition.md](./1-domain-definition.md) (v1.4) — 도메인 용어, 액터/권한 SSOT, 팀 라이프사이클, UC1-UC9, 성공기준 SC1-SC4<br>[2-PRD.md](./2-PRD.md) (v1.0) — MVP 범위, 기능/비기능 요구사항<br>[3-User-scenarios.md](./3-User-scenarios.md) (v1.0) — 실사용 흐름(US-01~US-08)<br>[6-tech-stack.md](./6-tech-stack.md) (v1.0) — 기술 스택 선정 근거(DB 비교·결정 포함) |

**변경 이력**

| 버전 | 일자 | 변경 내용 |
|---|---|---|
| v1.0 | 2026-09-07 | 최초 작성 |
| v1.1 | 2026-09-07 | 6-tech-stack.md의 비교 분석 결과를 반영하여 데이터베이스를 PostgreSQL로 확정 — "작업 가정/미확정" 표현을 확정된 결정으로 갱신 |
| v1.2 | 2026-09-14 | 실시간 채팅(UC5)을 WebSocket에서 REST 롱폴링으로 전환 — Vercel 서버리스 함수 배포와 상시 연결 WebSocket이 맞지 않아 재검토한 결과. `chat.gateway.ts`/`ws-broadcaster.ts`/`ws-auth.guard.ts`/`use-chat-socket.ts` 삭제, `chat.routes.ts`(REST)가 이력 조회·실시간 수신(폴링)·실시간 송신을 모두 담당하도록 5.2/5.4/6.1/6.2절 갱신 |
| v1.3 | 2026-09-16 | 모든 인증된 화면에 공통 상단 네비게이션(`APP_STYLE_GUIDE.md` 3.1절)을 적용하기 위해 `app/` 아래 `layout/`(`AppHeader.tsx`, `AppLayout.tsx`)과 `pages/`(`DashboardPage.tsx`, 대시보드 홈 화면)를 신설 — 6.1절 프런트엔드 디렉토리 구조 갱신. `routes.tsx`가 `RequireAuth` + `AppLayout`으로 인증된 화면을 한 번에 감싸는 중첩 라우트 구조로 바뀌었고, 캘린더가 `/`에서 `/calendar`로 이동하고 `/`는 새 대시보드 화면이 차지함(`docs/8-wireframes.md` 신설 절과 동기화) |

**전제 및 확정 사항**

- 본 문서에서 프런트엔드/백엔드 예시에 사용하는 기술 스택은 사용자가 명시적으로 확정한 값이다: **프런트엔드 = React + TypeScript, 백엔드 = Node.js + TypeScript, 실시간 채팅 = REST 롱폴링**(v1.2 — 최초 WebSocket 결정을 Vercel 서버리스 배포 호환을 위해 전환. 아래 6.2 각주 참조).
- 데이터베이스는 **PostgreSQL로 확정**되었다([6-tech-stack.md](./6-tech-stack.md) 4장 — 관계형 구조·참조 무결성, SC3 트랜잭션 일관성, 채팅 대량 누적 대응력, MVP 개발 생산성 기준의 비교 분석 결과). 아래 2.2/1.3의 "특정 DB에 종속되지 않는 경계" 원칙은 이 확정과 무관하게, 도메인 로직을 인프라 세부사항으로부터 보호하기 위한 아키텍처 원칙으로서 계속 유지된다.
- 본 문서는 **원칙/가이드라인 문서**이다. 데이터베이스 스키마, API 엔드포인트 목록, 컴포넌트 props 정의 등 구체적인 기술 설계 산출물은 다루지 않는다. 그런 산출물은 본 문서의 원칙을 따라 이후 단계에서 작성되어야 한다.

---

## 1. 모든 스택에 공통인 최상위 원칙

기술 스택이 무엇이든(프런트엔드가 React가 아니게 되거나, DB가 PostgreSQL이 아니게 되더라도) 지켜져야 하는 원칙이다.

### 1.1 관심사의 분리 (Separation of Concerns)
- 화면(프레젠테이션), 업무 흐름(애플리케이션/유스케이스), 핵심 규칙(도메인), 외부 연동(인프라)은 서로 다른 층에 위치해야 한다.
- 한 파일/모듈이 "일정을 화면에 그리는 일"과 "일정 충돌을 판정하는 일"을 동시에 하지 않는다.

### 1.2 단일 진실 공급원 (Single Source of Truth)
- 도메인 정의서 4장이 권한 규칙의 SSOT임을 코드 구조도 그대로 반영해야 한다. 즉, "팀장만 쓰기 가능", "변경 요청은 승인이 있어야 반영" 같은 규칙은 **코드베이스 안에서도 단 한 곳**(도메인 계층의 권한/정책 모듈)에서만 판단되어야 하며, 화면단·API 라우트·WebSocket 핸들러 등 여러 진입점에 규칙이 복제되어서는 안 된다.
- 이는 SC3(권한 무결성)을 코드 구조 수준에서 보장하기 위한 전제조건이다. 권한 판단이 여러 레이어에 흩어지면, 어느 한 진입점에서 검사가 누락되었을 때 SC3가 조용히 깨질 수 있다.

### 1.3 명시적 경계 (Explicit Boundaries)
- 도메인 로직(팀/일정/채팅/변경요청의 규칙)과 인프라(DB 접근, WebSocket 전송, 외부 라이브러리)는 인터페이스를 통해서만 연결한다.
- 도메인 로직이 특정 DB(예: PostgreSQL)나 특정 전송 방식(예: WebSocket 라이브러리)의 구체적 API를 직접 알지 못하게 한다. DB가 PostgreSQL로 확정된 지금도, 이 경계는 "미확정이라서"가 아니라 설계 원칙으로서 유지된다 — 나중에 DB를 교체하거나(예: 확장성 요구가 크게 달라지는 경우) 버전을 올리더라도 도메인 로직을 건드리지 않게 해주는 안전장치이기 때문이다.

### 1.4 예측 가능하고 탐색 가능한 구조 (Predictable / Discoverable Structure)
- 새로운 팀원이 "일정 충돌 감지 로직이 어디 있지?"라고 물었을 때, 폴더 이름과 파일 이름만으로 답을 추측할 수 있어야 한다.
- 폴더 구조는 도메인 용어집(팀/일정/채팅/변경요청)과 1:1로 대응하는 것을 우선하고, 기술적 편의(예: "utils", "helpers", "common"에 무분별하게 몰아넣기)보다 도메인 정렬을 우선한다.

### 1.5 관례 우선 (Convention over Configuration)
- 파일 위치, 네이밍, 레이어 배치 규칙을 일관되게 지켜, 매번 새로 결정하지 않아도 되게 한다. 예외가 필요하면 예외 자체를 명시적으로 문서화한다.

### 1.6 작은 반전성 (Small, Reversible Decisions)
- MVP 범위(PRD 5장)가 UC1-UC8 + 팀 라이프사이클이고 UC9(일정 충돌 감지)는 Should로 후속 배치 가능하다는 점을 구조에도 반영한다. 즉, UC9 관련 로직(충돌 감지 정책)은 별도 모듈로 분리하여, 있어도 없어도 나머지 시스템이 영향받지 않도록 설계한다. 이는 "가역적인 결정을 선호한다"는 아키텍처 원칙의 구체적 적용이다.

---

## 2. 의존성/레이어 원칙

### 2.1 레이어 구성

Team CalTalk은 다음 4개 레이어로 구성한다(프런트엔드/백엔드 공통 개념이며, 각 스택에서 구체적 이름은 다를 수 있다).

1. **프레젠테이션(Presentation)** — 사용자에게 보여주고 입력을 받는 층. 프런트엔드의 화면/컴포넌트, 백엔드의 라우트/컨트롤러/WebSocket 핸들러가 여기 속한다.
2. **애플리케이션/유스케이스(Application / Use Case)** — UC1-UC9에 대응하는 업무 흐름을 오케스트레이션하는 층. "변경 요청을 승인한다", "일정 저장 시 충돌을 검사한다" 같은 절차가 여기 위치한다.
3. **도메인(Domain)** — 팀/일정/채팅/변경요청이라는 핵심 개념과, 그에 대한 불변 규칙(4장 권한 표, 5장 팀 라이프사이클 규칙, "팀당 팀장 1명" 불변조건 등)이 위치한다. 외부 기술에 대한 지식이 없어야 한다.
4. **인프라(Infrastructure)** — DB 접근, WebSocket 실제 전송, 외부 서비스 연동 등 기술적 구현이 위치한다.

### 2.2 의존성 방향 규칙

- **의존성은 항상 도메인을 향해 안쪽으로 흐른다.** 프레젠테이션 → 애플리케이션 → 도메인. 인프라 → 도메인(인터페이스 구현을 통해).
- 도메인 계층은 어떤 상위/외부 계층도 알지 못한다. 도메인은 "팀장만 일정을 쓸 수 있다"는 규칙은 알아도, 그 규칙이 HTTP 라우트에서 오는지 WebSocket 메시지에서 오는지, PostgreSQL에 저장되는지는 알지 못한다.
- 인프라 계층이 도메인이 정의한 인터페이스(예: 리포지토리 인터페이스)를 구현하는 방향이지, 그 반대가 아니다. 이렇게 하면 DB 선택(확정: PostgreSQL, [6-tech-stack.md](./6-tech-stack.md) 4장 참조)이 향후 바뀌더라도 도메인/애플리케이션 계층은 영향을 받지 않는다.

### 2.3 Team CalTalk 도메인 개념의 매핑

도메인 정의서 6장의 개념 관계(팀 1:N 일정, 일정 1:1 채팅, 일정 1:N 변경요청)를 도메인 계층의 구조에 그대로 반영한다.

| 도메인 개념 | 레이어 내 위치 예시 |
|---|---|
| 팀(Team), 팀장/팀원 역할, 팀 라이프사이클 불변조건 | 도메인 계층 — `team` 모듈 |
| 일정(Schedule), 일정 충돌(ScheduleConflict) | 도메인 계층 — `schedule` 모듈 |
| 채팅(대화) | 도메인 계층 — `chat` 모듈 (일정에 종속되는 관계를 도메인 모델로 표현) |
| 변경 요청(ChangeRequest), 승인/거절 절차 | 도메인 계층 — `change-request` 모듈. 승인 시점에만 일정이 갱신된다는 SC3 규칙이 여기 집중되어야 한다 |

### 2.4 횡단 관심사(Cross-cutting Concerns)의 위치

- **인증(UC1)**은 모든 문제(P1-P3) 해결의 전제조건이 되는 횡단 관심사로 도메인 정의서에 명시되어 있다(10장 각주). 인증 검사는 특정 유스케이스 로직 안에 산발적으로 심지 않고, **프레젠테이션 계층의 진입점(라우트 미들웨어, WebSocket 연결 핸드셰이크)에서 공통으로 강제**한다. 즉, 인증되지 않은 요청은 애플리케이션 계층에 도달하기 전에 차단되어야 한다.
- **권한 검사**(팀장만 쓰기 가능, 변경 요청 승인 권한 등, 4장 SSOT)는 인증과 달리 요청의 신원뿐 아니라 도메인 상태(이 사용자가 이 팀의 팀장인가)에 의존하므로, **애플리케이션 계층이 도메인 계층의 권한 판단 함수를 호출하는 방식**으로 구현한다. 권한 판단 로직 자체는 도메인 계층에 단 한 벌만 존재해야 하며(1.2 참조), 프레젠테이션 계층은 그 판단 결과를 받아 응답할 뿐 직접 권한을 재해석하지 않는다.
- 이렇게 배치하는 이유는, 인증/권한 검사가 라우트별·화면별로 복제되면 어느 한 곳의 검사 누락이 SC3(권한 무결성)를 조용히 위반할 수 있기 때문이다. 진입점 강제 + 도메인 단일 판단 로직의 조합으로 이 위험을 구조적으로 줄인다.

---

## 3. 코드/네이밍 원칙

### 3.1 일반 규칙 (TypeScript 공통)

| 대상 | 규칙 | 예시 |
|---|---|---|
| 폴더/파일명 (React 컴포넌트 파일 제외) | kebab-case | `change-request/`, `schedule-conflict.ts` |
| 타입/인터페이스/클래스 | PascalCase | `ChangeRequest`, `ScheduleConflict` |
| React 컴포넌트 파일 | PascalCase + `.tsx` (컴포넌트 파일명은 위 kebab-case 규칙의 예외) | `CalendarView.tsx`, `ScheduleForm.tsx` |
| 함수/변수/훅 | camelCase | `approveChangeRequest()`, `useScheduleConflicts()` |
| 상수 | UPPER_SNAKE_CASE | `MAX_TEAM_MEMBERS` (필요한 경우에 한함, 남용 지양) |
| React 커스텀 훅 파일 | `use-` 접두사 + kebab-case | `use-change-request.ts` |
| 테스트 파일 | 대상 파일명 + `.test.ts`/`.spec.ts` | `approve-change-request.usecase.test.ts` |

### 3.2 도메인 용어의 코드 반영 (Ubiquitous Language)

도메인 정의서 3장 용어집의 표현이 문서와 코드 사이에서 어긋나면, 시간이 지날수록 "문서상 개념"과 "코드상 개념"이 분리되어 도메인 이해가 왜곡된다. 이를 막기 위해 다음을 원칙으로 한다.

- 용어집의 한글 개념은 **정해진 영문 용어로 고정하여 코드 전반에 일관되게 사용**한다. 임의로 동의어(`Request`, `Booking`, `Session` 등)를 섞어 쓰지 않는다.

| 도메인 용어(한글) | 코드 내 고정 영문 용어 | 비고 |
|---|---|---|
| 팀 | `Team` | |
| 팀장 / 팀원 | `TeamLeader` / `TeamMember` (역할 값으로는 `LEADER` / `MEMBER`) | "역할(role)"이지 별도 계정 타입이 아님에 유의 |
| 일정 | `Schedule` | 문서는 "Schedule/Event"를 병기하나, 코드에서는 `Schedule`로 통일 |
| 자신과 관련된 일정 | `getSchedulesForParticipant(userId)` 류의 함수명으로 표현 | 별도 타입을 만들기보다 조회 조건으로 표현 |
| 일정 충돌 | `ScheduleConflict` | UC9/SC4 대응 로직의 타입/모듈명 |
| 변경 요청 | `ChangeRequest` | 상태값은 `PENDING` / `APPROVED` / `REJECTED` 등으로 명시적 열거 |
| 채팅(대화) | `Chat` (메시지 단위는 `ChatMessage`) | 일정에 종속되는 관계(1:1)를 필드/참조로 표현 |
| 인증 | `Auth` (`authenticate`, `AuthGuard` 등) | |
| 권한 | `Permission` (역할별 판단 함수는 `can*` 접두사, 예: `canEditSchedule`(일정 쓰기 권한, 팀장 전용), `canAccessTeamChat`(채팅 접근 권한 — 팀 소속 여부만 확인하는 단순 규칙; 팀장/팀원 모두 자유롭게 작성·열람 가능, 도메인 정의서 4장 SSOT)) | |

- 함수명은 유스케이스 문서의 동사를 그대로 반영한다. 예: UC7 "승인/거절"은 `approveChangeRequest()` / `rejectChangeRequest()`로, 임의로 `updateRequestStatus()` 같은 추상화된 이름을 쓰지 않는다. 이렇게 하면 코드 리뷰나 온보딩 시 도메인 문서와 코드를 나란히 놓고 대조할 수 있다.
- 반대로, 도메인 문서에 없는 개념을 코드에서 새로 만들어내지 않는다(예: 문서에 없는 "임시 승인" 같은 상태를 임의로 추가하지 않음).

---

## 4. 테스트/품질 원칙

### 4.1 테스트 피라미드

- **단위 테스트(다수)**: 도메인 계층의 순수 로직. 외부 의존성(DB, 네트워크) 없이 빠르게 실행되어야 한다.
- **통합 테스트(중간 수량)**: 애플리케이션 계층 + 인프라 계층의 결합(예: 리포지토리를 통해 실제 DB 또는 테스트 DB와 상호작용하는 유스케이스 흐름).
- **E2E/시나리오 테스트(소수)**: 3-User-scenarios.md의 US-01~US-08급 흐름을 검증하는 소수의 대표 시나리오(예: 변경 요청 → 승인 → 캘린더 반영 전체 흐름).

### 4.2 반드시 단위 테스트로 커버해야 하는 영역

도메인 정의서 9장의 성공기준(SC1-SC4)에 대응하는 핵심 도메인 로직은 예외 없이 단위 테스트로 커버한다.

| 성공기준 | 반드시 단위 테스트할 로직 |
|---|---|
| SC1 (기간 제한 없는 전체 일정 조회) | 캘린더 조회 조건 구성 로직에 기간 제한이 섞여 들어가지 않는지 |
| SC2 (채팅 이력 영구 보존, 팀 해체 시 예외) | 일정 삭제 시 채팅 이력이 삭제되지 않는지, 팀 해체 시에만 함께 삭제되는지의 분기 로직 |
| SC3 (권한 무결성 — 승인 없이는 미반영) | 권한 판단 함수(`canEditSchedule` 등), 변경 요청 승인/거절 로직(`approveChangeRequest`, `rejectChangeRequest`)이 승인 전에는 원본 일정을 변경하지 않는지 |
| SC4 (일정 충돌 저장 시점 경고) | `ScheduleConflict` 판정 로직이 겹치는 시간대를 정확히 감지하되 저장 자체는 차단하지 않는지 |

- 아울러 4장 불변조건("팀은 항상 정확히 1명의 팀장을 가진다")과 5장 팀 라이프사이클 규칙(팀장 위임, 팀 해체 조건)도 도메인 계층 단위 테스트의 필수 대상이다.
- 통합 테스트는 위 로직이 실제 인프라(DB, WebSocket)와 결합했을 때도 동일하게 동작하는지 확인하는 데 집중하며, 도메인 규칙 자체를 다시 검증하는 중복 테스트는 지양한다.

### 4.3 코드 리뷰 / 품질 게이트

- 권한/변경요청 관련 로직 변경은 최소 1인 이상의 리뷰를 거친다(SC3 위반 위험이 가장 큰 영역이므로).
- 신규/변경된 도메인 로직에 대응하는 단위 테스트가 없으면 병합하지 않는다.
- 레이어 의존성 방향 위반(예: 도메인 계층이 인프라 계층을 직접 import)은 리뷰에서 명시적으로 확인한다.

### 4.4 정적 분석/포매팅 도구

- TypeScript 코드베이스(프런트엔드/백엔드 공통)는 린터(예: ESLint류)와 포매터(예: Prettier류)를 CI에 강제하여, 스타일 논쟁을 줄이고 리뷰를 로직에 집중시킨다.
- 레이어 간 의존성 방향(2장)을 정적으로 강제할 수 있는 린트 규칙(예: 도메인 계층에서 인프라 계층 import 금지)을 도입하는 것을 권장한다. 구체적 도구/버전 선정은 본 문서의 범위를 벗어난다.

---

## 5. 설정/보안/운영 원칙

### 5.1 환경설정 관리

- 환경별(로컬/개발/운영) 설정값은 환경변수로 주입하고, 코드에 하드코딩하지 않는다.
- 비밀값(DB 접속 정보, 세션/토큰 서명 키 등)은 절대 저장소에 커밋하지 않는다. `.env` 등 실제 값이 담긴 파일은 버전관리에서 제외하고, 예시 템플릿(`.env.example`)만 커밋한다.
- 설정 로딩과 검증(필수 환경변수 누락 시 기동 실패 등)은 인프라 계층의 진입점에서 한 번에 처리하여, 잘못된 설정으로 부분 기동되는 상황을 막는다.

### 5.2 인증/권한 강제 지점

- UC1(인증)은 우회 불가능한 위치에서 강제되어야 한다. 구체적으로:
  - HTTP 요청은 라우트 미들웨어 단계에서 인증 여부를 검사하며, 개별 컨트롤러가 각자 인증을 확인하도록 맡기지 않는다. 실시간 채팅(UC5, 롱폴링 수신/전송)도 별도 인증 경로를 두지 않고 이 공통 미들웨어를 그대로 통과한다 — 과거 WebSocket 핸드셰이크/메시지 단위 재검증이 하던 역할을, REST로 전환한 뒤에는 매 폴링/전송 요청 자체가 독립된 인증된 HTTP 요청이라는 점이 자연스럽게 대신한다.
- 권한(4장 SSOT) 검사는 애플리케이션 계층이 도메인 계층의 판단 로직을 반드시 경유하도록 강제하고, 프레젠테이션 계층이나 인프라 계층에서 권한을 임의로 재판단하지 않는다(2.4 참조). 이는 "권한 검사가 여러 진입점에 흩어지지 않게 한다"는 1.2 원칙의 실행 지점이다.

### 5.3 로깅/관측성 기본 원칙

- 권한 판단 실패(예: 팀원이 쓰기를 시도), 변경 요청 승인/거절 같은 도메인상 중요한 이벤트는 감사 가능하도록 로깅한다(누가/언제/무엇을).
- 로그에 개인정보나 비밀값을 남기지 않는다.
- 오류 로깅과 일반 운영 로깅을 구분하여, 장애 시 원인 추적이 가능하게 한다. 구체적 로깅/모니터링 도구 선정은 본 문서 범위를 벗어난다.

### 5.4 채팅 저장소 확장성에 대한 설계 수준 대비

- PRD 8장은 채팅 이력이 SC2에 따라 기간 제한 없이 영구 보존되므로 저장소가 선형으로 증가하는 리스크를 명시하고 있다. 본 문서는 구체적 아카이빙 구현을 다루지 않지만, 설계 원칙 수준에서 다음을 미리 고려한다.
  - 채팅 메시지의 저장/조회 로직을 도메인 인터페이스 뒤에 두어(2.2 참조), 추후 저장 전략(예: 콜드 스토리지 이관)이 바뀌어도 애플리케이션/도메인 계층이 영향받지 않게 한다.
  - 조회 API/쿼리 경로를 설계할 때부터 "무기한 누적 데이터"를 전제로 페이지네이션 등 점진적 조회가 가능한 구조를 기본값으로 삼는다.
  - (v1.2 갱신) 최초 설계에서는 실시간 송수신(UC5)과 이력 조회(UC8)를 REST/WebSocket으로 경로 분리했으나, 배포 대상을 Vercel 서버리스 함수로 정하면서 상시 연결이 필요한 WebSocket을 유지할 수 없다는 제약이 드러났다. 서버리스 함수는 요청 단위로 짧게 실행되고 종료되는 모델이라, 연결을 계속 열어두는 방식과 구조적으로 맞지 않기 때문이다. 재검토 결과 UC5도 REST 롱폴링(클라이언트가 응답을 받는 즉시 반복 요청)으로 구현하기로 했다 — 서버가 새 메시지가 생길 때까지 일정 시간 응답을 들고 있다가 돌려주는 방식으로, 매 요청이 독립적인 HTTP 요청-응답이라 서버리스 모델과 충돌하지 않는다(6.2의 `chat.routes.ts` 참조 — 이력 조회/실시간 수신(폴링)/실시간 송신을 모두 이 라우터가 담당).
  - 이 전환에는 트레이드오프가 있다: 폴링 주기(초 단위) 만큼의 지연이 WebSocket 대비 생기고, 동시 접속자가 늘수록 서버리스 함수 실행 시간·DB 쿼리 수가 WebSocket 대비 늘어난다. MVP 규모에서는 감내 가능하다고 판단했다.
  - 저장/조회 로직을 도메인 인터페이스 뒤에 둔 원래 설계(2.2 참조) 덕분에, 이 전환도 `domain/chat/chat.repository.ts` 인터페이스와 `chat_messages` 테이블 자체는 건드리지 않고 프레젠테이션 계층(라우트)과 프런트엔드 훅만 교체해 끝났다 — 1.6 원칙("나중에 결정을 바꿀 여지를 구조적으로 남겨두자")이 실제로 작동한 사례다.

---

## 6. 프런트엔드, 백엔드별 디렉토리 구조

아래 구조는 예시이며, 세부 파일 배치는 팀 컨벤션에 따라 조정될 수 있다. 다만 레이어 경계(2장)와 도메인 정렬(1.4, 3.2)은 유지되어야 한다.

### 6.1 프런트엔드 (React + TypeScript)

기능(도메인) 기반 구조를 기본으로 하되, 여러 기능이 공유하는 것은 `shared`에 둔다.

```text
frontend/
├── src/
│   ├── app/                        # 앱 진입점, 라우팅, 전역 프로바이더(인증 컨텍스트 등)
│   │   ├── App.tsx
│   │   ├── routes.tsx               # UC1 인증 여부에 따른 라우트 가드 포함(RequireAuth + AppLayout으로
│   │   │                             #  인증된 화면을 감싼 뒤 그 안에서 /, /calendar, /team을 분기)
│   │   ├── providers/               # 인증/세션 등 전역 컨텍스트 프로바이더
│   │   ├── layout/                  # 모든 인증된 화면이 공유하는 레이아웃(v1.3 신설)
│   │   │   ├── AppHeader.tsx        # 최상단 네비게이션 바(APP_STYLE_GUIDE.md 3.1절) — 대시보드/팀/
│   │   │   │                         #  캘린더 링크, 현재 팀 배지, 사용자명, 로그아웃
│   │   │   └── AppLayout.tsx        # AppHeader + <Outlet />으로 하위 라우트를 감싸는 레이아웃 라우트
│   │   └── pages/                   # 특정 feature에 속하지 않는 최상위 페이지(v1.3 신설)
│   │       └── DashboardPage.tsx    # "/" 대시보드 화면 — 인사말, 오늘 날짜, 실시간 시계
│   │
│   ├── features/                    # 도메인(유스케이스) 단위 기능 모듈
│   │   ├── auth/                    # UC1 로그인/인증
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── api/                 # 인증 관련 API 클라이언트
│   │   │
│   │   ├── team/                    # 팀 생성/초대/가입/탈퇴/팀장 위임 (도메인 5장)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── api/
│   │   │
│   │   ├── calendar/                # UC2~UC4, UC9: 팀 캘린더 조회, 일정 등록/수정/삭제(팀장), 충돌 경고
│   │   │   ├── components/
│   │   │   │   ├── CalendarView.tsx         # 월/주/일 뷰
│   │   │   │   ├── ScheduleForm.tsx         # 팀장 전용 일정 생성/수정 폼
│   │   │   │   └── ScheduleConflictBanner.tsx # UC9/SC4 충돌 경고 표시
│   │   │   ├── hooks/
│   │   │   │   └── use-schedule-conflicts.ts
│   │   │   └── api/                 # 일정 조회/등록/수정/삭제 API 클라이언트
│   │   │
│   │   └── chat/                    # UC5~UC8: 캘린더-채팅 연동, 변경 요청, 채팅 이력
│   │       ├── components/
│   │       │   ├── ScheduleChatPanel.tsx     # 일정 상세와 나란히 표시되는 채팅창(UC5)
│   │       │   ├── ChangeRequestForm.tsx     # 팀원의 변경 요청 작성(UC6)
│   │       │   └── ChangeRequestApproval.tsx # 팀장의 승인/거절 UI(UC7)
│   │       ├── hooks/
│   │       │   └── use-chat-polling.ts       # 실시간 채팅 롱폴링 수신/전송 훅(v1.2, WebSocket에서 전환)
│   │       └── api/                 # 채팅 이력 조회, 롱폴링 수신/전송, 변경 요청 API 클라이언트
│   │
│   ├── shared/                      # 여러 feature가 공유하는 것만 위치 (도메인 정렬을 해치지 않는 선에서)
│   │   ├── components/              # 범용 UI 컴포넌트(Button, Modal 등)
│   │   ├── hooks/                   # 범용 훅
│   │   ├── api/                     # 공통 API 클라이언트 설정(인증 토큰 첨부 등)
│   │   └── types/                   # 여러 feature가 함께 쓰는 도메인 타입(Team, Schedule 등)
│   │
│   └── styles/
│
├── tests/                           # 통합/E2E 테스트 (feature 내부 *.test.ts는 단위 테스트)
├── .env.example
└── package.json
```

### 6.2 백엔드 (Node.js + TypeScript)

2장의 레이어(프레젠테이션 → 애플리케이션 → 도메인 → 인프라)를 폴더로 명시적으로 분리한다.

```text
backend/
├── src/
│   ├── presentation/                 # 프레젠테이션 계층: 진입점, 인증/입력 검증
│   │   ├── http/
│   │   │   ├── middlewares/
│   │   │   │   └── auth.middleware.ts   # UC1 인증 강제 지점 (5.2 참조)
│   │   │   └── routes/
│   │   │       ├── team.routes.ts
│   │   │       ├── schedule.routes.ts
│   │   │       ├── change-request.routes.ts
│   │   │       └── chat.routes.ts           # 이력 조회(UC8, 페이지네이션), 실시간 수신(UC5, 롱폴링), 실시간 송신(UC5) 모두 담당 (5.4 참조, v1.2 — WebSocket에서 REST로 전환)
│   │
│   ├── application/                  # 애플리케이션 계층: 유스케이스 오케스트레이션
│   │   ├── team/
│   │   │   └── invite-team-member.usecase.ts
│   │   ├── schedule/
│   │   │   ├── create-schedule.usecase.ts     # UC3, 내부에서 권한 판단 + 충돌 감지 호출
│   │   │   └── list-team-schedules.usecase.ts # UC2, SC1 (기간 제한 없는 조회)
│   │   ├── change-request/
│   │   │   ├── submit-change-request.usecase.ts   # UC6
│   │   │   ├── approve-change-request.usecase.ts  # UC7, SC3 핵심 지점
│   │   │   └── reject-change-request.usecase.ts    # UC7
│   │   └── chat/
│   │       ├── send-chat-message.usecase.ts       # UC5, 실시간 송신(POST, chat.routes.ts 경유, v1.2 — 과거 chat.gateway.ts에서 이관)
│   │       ├── poll-chat-messages.usecase.ts       # UC5, 실시간 수신 롱폴링 — cursor 이후 새 메시지가 생길 때까지 대기 후 응답(v1.2 신규)
│   │       └── list-chat-history.usecase.ts        # UC8, 채팅 이력 조회(페이지네이션, 5.4/6.2 참조)
│   │
│   ├── domain/                       # 도메인 계층: 핵심 규칙, 외부 기술 비의존
│   │   ├── team/
│   │   │   ├── team.entity.ts                  # 팀/팀장 1명 불변조건 (4장)
│   │   │   ├── team-lifecycle.rules.ts          # 팀 생성/위임/해체 규칙 (5장)
│   │   │   └── team.repository.ts               # 인터페이스만 정의 (구현은 infrastructure)
│   │   ├── schedule/
│   │   │   ├── schedule.entity.ts
│   │   │   ├── schedule-conflict.ts             # ScheduleConflict 판정 로직 (UC9/SC4)
│   │   │   └── schedule.repository.ts           # 인터페이스만 정의 (구현은 infrastructure)
│   │   ├── chat/
│   │   │   ├── chat.entity.ts                   # Chat 애그리게이트 — 일정과의 1:1 관계를 표현 (3.2 용어표 참조)
│   │   │   ├── chat-message.entity.ts
│   │   │   └── chat.repository.ts               # 인터페이스만 정의 (구현은 infrastructure)
│   │   ├── change-request/
│   │   │   ├── change-request.entity.ts         # 상태(PENDING/APPROVED/REJECTED)
│   │   │   └── change-request.repository.ts     # 인터페이스
│   │   └── permission/
│   │       └── permission.policy.ts             # canEditSchedule(쓰기 권한), canAccessTeamChat(채팅 접근 — 팀 소속 여부만 확인) 등, 4장 SSOT의 코드상 단일 구현
│   │
│   └── infrastructure/               # 인프라 계층: DB 접근 등
│       ├── db/
│       │   ├── postgres/                        # 확정: PostgreSQL (6-tech-stack.md 4장, 경계 원칙은 5.4/1.3 참조)
│       │   │   ├── team.repository.impl.ts
│       │   │   ├── schedule.repository.impl.ts
│       │   │   ├── chat.repository.impl.ts      # 채팅 이력 저장/조회 — 실시간 송신(UC5)과 롱폴링 수신(UC5) 모두 이 구현체를 공유(5.4)
│       │   │   └── change-request.repository.impl.ts
│       │   └── migrations/
│       └── config/
│           └── env.ts                            # 환경변수 로딩/검증 (5.1)
│
├── tests/
│   ├── unit/                         # 도메인 계층 위주 (4.2의 SC1-SC4 대응 로직 필수 포함)
│   └── integration/                  # 애플리케이션+인프라 결합 테스트
│
├── .env.example
└── package.json
```

**주석 보완**
- `application/change-request/approve-change-request.usecase.ts`는 SC3("승인 없이는 일정에 미반영")를 직접 구현하는 지점이므로, 4.3의 코드 리뷰 필수 대상이자 4.2의 단위 테스트 필수 대상이다.
- `domain/permission/permission.policy.ts`는 4장 권한 SSOT의 코드상 유일한 구현이며, `presentation`과 `infrastructure`는 이 모듈을 우회하여 권한을 재판단하지 않는다.
- `infrastructure/db/postgres/`는 [6-tech-stack.md](./6-tech-stack.md) 4장의 비교 분석에 따라 확정된 PostgreSQL 구현체이며, 향후 DB를 교체(또는 버전업)하더라도 이 폴더의 구현체만 교체되고 `domain`의 리포지토리 인터페이스와 `application`의 유스케이스는 변경되지 않아야 한다(2.2 의존성 방향 원칙의 실증). 이는 DB가 미확정이라서가 아니라, 확정 이후에도 지켜야 할 경계 원칙이다.
- `application/chat/send-chat-message.usecase.ts`(UC5 송신), `poll-chat-messages.usecase.ts`(UC5 수신), `list-chat-history.usecase.ts`(UC8)는 별도 유스케이스로 분리한다: 각각 실시간 송신, 실시간 수신(대기 포함), 페이지네이션 조회로 책임이 다르기 때문이다(5.4 참조). 셋 다 `chat.routes.ts`(REST)를 경유한다(v1.2 — 과거 실시간 송수신은 `chat.gateway.ts`(WebSocket) 경유였으나 REST로 전환). 세 유스케이스 모두 `domain/chat/chat.entity.ts`(일정과의 1:1 관계)와 `chat-message.entity.ts`를 함께 다루되, 도메인 정의서 6장의 "일정 1:1 채팅" 관계는 `chat.entity.ts`에서 표현한다.

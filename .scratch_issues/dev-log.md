# 이슈 40~48 순차 처리 개발 로그

## 진행 방식 (합의된 워크플로우)
- 이슈별로: 자식 브랜치(feature-N) 분기 → 분석(서브에이전트) → 계획수립(서브에이전트) → 테스트작성+구현(병렬 서브에이전트, 구현 에이전트가 tsc/eslint까지 확인) → 커밋
- **테스트 실행(vitest run)은 이슈별로 하지 않고, 48번까지 전부 끝난 뒤 일괄 실행**하기로 합의함 (2026-09-11)
- 브랜치는 feature-40 → feature-41 → feature-42 → ... 순으로 이전 이슈 브랜치에서 분기 (누적 구조)

## 상태 요약 (마지막 갱신: **40~48번 브라우저 E2E 직접 검증 + 치명적 버그 2건 수정 완료**, 2026-09-14)

**재개 방법**: 유닛/컴포넌트 테스트(vitest)는 40~48번 전체가 통과하지만, 이것만으로는 "실사용 가능"을 보장하지 못한다는 것이 2026-09-14 검증에서 확인됨. 실제로 리더+멤버 두 계정으로 로그인해 브라우저에서 전 기능을 직접 눌러본 결과 **FE-2와 FE-7/FE-8에서 실사용을 막는 치명적 버그**가 발견되었고, 원인 분석 후 백엔드 엔드포인트 2개 추가 + 프론트 배선 수정으로 해결함(아래 "2026-09-14 브라우저 E2E 검증 및 치명적 버그 수정" 절 참조). FE-9의 중복생성 버그는 같은 날 그 이전 세션에서 이미 수정됨(아래 "2026-09-14 검토 및 수정" 절). **수정 사항은 전부 미커밋 상태.**

| 이슈 | 제목 | 브랜치 | 분석 | 계획 | 구현+테스트작성 | 커밋 | 비고 |
|---|---|---|---|---|---|---|---|
| #40 FE-1 | 인증 화면/라우트가드 | feature-40 | 완료 | 완료 | 완료 | **완료** (5d95cdc) | 브라우저 수동검증까지 완료 |
| #41 FE-2 | 팀 관리 UI | feature-41 | 완료 | 완료 | 완료 | **완료** (ba62103, 치명적 버그수정 미커밋) | 유닛테스트는 통과했지만 **승인된 멤버가 팀 화면에 영구히 진입할 수 없는 버그**가 실사용 검증에서 발견되어 수정함(아래 상세 절) |
| #42 FE-3 | 캘린더 조회 | feature-42 | 완료 | 완료 | 완료 | **완료** (1a06c27) | 테스트 171개 전체 통과, 브라우저 검증도 정상 |
| #43 FE-4 | 일정 생성/수정/삭제 폼 | feature-43 | 완료 | 완료 | 완료 | **완료** (f38b77d) | 테스트 204개 전체 통과, 브라우저 검증도 정상 |
| #44 FE-5 | 채팅 실시간(WS) | feature-44 | 완료 | 완료 | 완료 | **완료** (fd28ab6) | 테스트 224개 전체 통과, 브라우저 양방향 실시간 검증 정상 |
| #45 FE-6 | 채팅 이력(REST) | feature-45 | 완료 | 완료 | 완료 | **완료** (42eed85) | 테스트 242개 전체 통과, 58개 메시지로 페이지네이션 브라우저 검증 정상 |
| #46 FE-7 | 변경요청 제출 폼 | feature-46 | 완료 | 완료 | 완료 | **완료** (b4ac290) | 제출 자체는 정상이나, 리더가 이를 볼 방법이 없던 문제는 #47과 묶여 아래에서 해결 |
| #47 FE-8 | 변경요청 승인/거절 | feature-47 | 완료 | 완료 | 완료 | **완료** (3e1a7aa, 치명적 버그수정 미커밋) | 유닛테스트(299개)는 통과했지만 **팀장이 대기중 변경요청을 절대 볼 수 없어 승인/거절이 실사용에서 불가능한 버그**가 발견되어 수정함(아래 상세 절) — 원인은 테스트가 `rerender`로 같은 컴포넌트 인스턴스의 `isLeader`만 바꿔치기해 교차 세션 문제를 가릴 수 없었던 구조 |
| #48 FE-9 | 일정충돌 배너 | feature-48 | 완료 | 완료 | 완료 | **완료** (c901a9d, 버그수정 미커밋) | 테스트 283개 전체 통과. 2026-09-14 검토에서 발견된 중복생성 버그 수정 포함(아래 상세 절 참조), 브라우저 검증 완료 |

---

## 중요 컨텍스트 (재작업 시 다시 조사하지 않아도 됨)

- **워킹 트리에 이슈 #40~48과 무관한 백엔드 미커밋 변경사항이 있음**(`backend/src/application/team/{join-team,approve-join-request,list-pending-join-requests}.usecase.ts` 등, 팀 가입/승인 플로우). 이것은 실제로 **이슈 #41이 필요로 하는 정확한 API**를 구현한 것으로 확인됨. 커밋하라는 지시는 없었으므로 백엔드는 계속 미커밋 상태로 두고 개발 서버(`cd backend && npm run dev`)로만 활용 중.
- `frontend/src/shared/types/{auth,team}.types.ts`에 필요한 타입이 이미 swagger와 일치하게 정의되어 있어 매 이슈마다 재정의하지 않고 재사용.
- `frontend/src/shared/api/{http-client,token-storage,api-error}.ts`는 FE-1에서 완성, 이후 모든 이슈에서 수정 금지 원칙으로 재사용.
- "내 팀 목록 조회" API가 백엔드에 없어(#41 분석 중 확인), 팀 관리 UI는 "단일 팀 컨텍스트"로 단순화(localStorage에 현재 팀 id/name만 보관). 팀 가입은 팀 ID(UUID) 직접 입력 방식.
- vitest coverage.include를 이슈마다 새 feature 경로 추가해야 함 (`vitest.config.ts`) — 각 구현 에이전트가 처리하도록 지시 중.

## 참고: 백엔드 이슈 클로즈 건 (보류)
- 사용자가 "백엔드 이슈 클로즈해줘" 요청했으나, 열려있는 순수 백엔드 전용 GitHub 이슈가 없음(BE-1~BE-10 #10~28 전부 closed). 워킹트리의 미커밋 백엔드 작업(팀 가입/승인)과 매칭될 만한 후보는 #32([Phase 2] DB검증/시드+팀도메인, area:db/backend/frontend 혼합)이지만 확답 못 받음. **사용자가 대신 FE #43~46 진행을 지시해서 일단 보류 상태 — 나중에 다시 물어볼 것.**

---

## 이슈별 상세 로그 (40 ~ 48 순차 정렬)

### #40 FE-1 (완료, feature-40, 커밋 5d95cdc)
- **주요 내용**: react-router-dom 도입, AuthProvider/RequireAuth, LoginForm/RegisterForm/AuthPage, /login /register 라우트, 보호된 `/` 임시 HomePlaceholder
- **검증**: 테스트 52개 통과, 커버리지 82.75%. 브라우저 수동 검증 완료(회원가입→로그인→보호라우트→로그아웃→재차단 전부 확인).

### #41 FE-2 (완료, feature-41, 커밋 ba62103)
- **분석**: 백엔드 팀 가입/승인 2단계 API 확인 완료, team.types.ts 재사용 가능 확인.
- **계획**: "단일 팀 컨텍스트"로 스코프 축소 결정(GET /teams 없음, localStorage에 현재 팀 id/name 보관). team.api.ts(8개 함수), use-current-team/use-team-members/use-join-requests 훅 3개, CreateTeamForm/JoinTeamForm/MemberList/InviteMemberForm/PendingJoinRequestsPanel/LeaveTeamButton/TeamDashboard/TeamPage 컴포넌트 8개, routes.tsx에 /team 라우트 추가(HomePlaceholder에 링크).
- **구현 및 테스트**: 병렬 진행, 두 에이전트 모두 최종적으로 vitest 실행해 정합성 확인(계획보다 빨리 검증됨) — 21개 파일/110개 테스트 통과, tsc/eslint 클린, 커버리지 88%대.
- **설계 참고**: JoinTeamForm은 승인 전이라 onCreated 콜백 없음(멤버십 즉시 생성 안 됨), LeaveTeamButton은 유일 리더일 때 클라이언트에서도 선제적으로 버튼 비활성화.

### #42 FE-3 (완료, feature-42, 커밋 1a06c27)
- **착수 정보**: 브랜치 feature-42는 feature-41에서 분기(팀 컨텍스트 코드 포함 누적).
- **분석**: `GET /teams/{teamId}/schedules?view&date`(형식검증용, 실제 필터링 안 함, 백엔드가 이미 소프트삭제 필터링해서 반환), `schedule.types.ts` 재사용 가능.
- **중요 발견 (버그성 갭)**: `AuthProvider.tsx`가 새로고침 시 `user`를 복원하지 않음(토큰만 복원, `/auth/me` 없음) → role 기반 UI가 새로고침 후 깨짐. 계획에 "token-storage.ts에 getAuthUser/setAuthUser/clearAuthUser 추가 + AuthProvider가 login/logout/401시 이를 호출" 하는 최소 보완 포함시킴(백엔드 신규 엔드포인트 없이 해결, fail-closed로 role 판정).
- **계획**: 날짜라이브러리 미도입(순수 Date), calendar-date.util/schedule-period.util(순수함수)+schedule.api+use-calendar-navigation/use-team-schedules 훅+ScheduleChip/MonthGrid/AgendaListView(월간외 주/일 공용)/CalendarToolbar/CalendarView 컴포넌트. 일정 클릭은 라우팅 대신 콜백/내부state 방식(FE-5 계약 미확정이라 최소 훅포인트만). routes.tsx `/`를 CalendarView로 교체(HomePlaceholder 제거, 네비게이션은 CalendarView 헤더에 인라인).
- **검증**: 테스트 171개 전체 통과 및 구현 완료.

### #43 FE-4 (완료, feature-43, 커밋 f38b77d)
- **착수 시 유의사항**:
  - `git checkout feature-42 && git checkout -b feature-43` 로 시작.
  - 이슈 #43(FE-4)은 `ScheduleForm.tsx`(생성/수정 겸용)를 `src/features/calendar/components/`에 추가하고, FE-3의 `CalendarView.tsx`가 노출한 "일정 클릭 진입점"(콜백/내부 state 방식, 라우팅 아님)과 `CalendarToolbar`의 "+ 일정 생성" 버튼(현재 클릭 핸들러 미연결 상태일 수 있음 — FE-3 구현체 확인 필요)에 실제로 폼을 연결해야 함.
  - `conflictWarnings` 필드는 응답에 있지만 FE-4에서는 무시(빈 배열 스텁, FE-9(#48) 범위).
  - 삭제는 204(소프트 삭제) — 캘린더에서 즉시 제거해야 하므로 `useTeamSchedules().refresh()` 재사용.
  - 예전과 동일하게: 분석→계획→(테스트작성+구현 병렬, 구현 에이전트가 tsc/eslint 확인)→커밋.
- **분석**: 참여자는 email 아닌 userId(UUID) 배열. `schedule.types.ts`에 필요한 타입 이미 존재. `schedule.api.ts`엔 getTeamSchedules만 있음(create/update/delete 추가 필요).
- **FE-3 미배선 확인**: `CalendarView.tsx`가 `CalendarToolbar`에 `onCreateClick` 안 넘겨줌(버튼은 있는데 클릭해도 무반응), `selectedScheduleId`도 setter만 쓰이고 버려지는 스텁, `onScheduleClick` prop은 `routes.tsx`에서 전달 안 됨. FE-4가 `CalendarView.tsx`에 모달상태(formMode/editingSchedule) 추가해서 실제로 연결해야 함.
- **계획**: ScheduleForm은 참여자 체크박스 목록(칩+드롭다운 대신, 오버엔지니어링 방지), datetime-local↔ISO 변환은 순수함수(schedule-datetime.util.ts), 삭제확인은 window.confirm(별도 모달 없음), 모달은 조건부렌더링+고정오버레이(라이브러리 없음). CalendarView에 formMode/editingSchedule state 추가해 onCreateClick 연결 + handleScheduleClick에 LEADER면 edit모드 오픈 추가.
- **검증**: 테스트 204개 전체 통과 및 구현 완료.

### #44 FE-5 (완료, feature-44, 커밋 fd28ab6)
- **충돌 확인 및 조정안 확정**: `selectedScheduleId`는 `const [, setSelectedScheduleId]`로 값이 버려지는 죽은 state였음(FE-5가 되살려 쓰면 됨). 와이어프레임 2.4절 근거로 "클릭=채팅패널 오픈(전역할 공통), 수정은 상세영역 내 별도 [수정]버튼"으로 조정하기로 계획에 반영 지시함 — `handleScheduleClick`에서 isLeader 분기(수정폼 자동오픈) 제거하고 `handleEditClick` 신설.
- **WS 프로토콜**: `ws://.../ws/chat?token=JWT`(쿼리), 4401=인증실패(재연결 대상에서 제외, 재로그인 유도), join/message 커맨드, 네이티브 WebSocket으로 충분(라이브러리 불필요). `chat.types.ts`에 ChatMessage 등 이미 있음, WS프레임 discriminated union만 신규 필요.
- **계획**: ScheduleChatPanel은 schedule 객체 전체를 prop으로 받음(CalendarView가 이미 들고 있는 schedules에서 find), 우측 슬라이드오버 패널(w-3xl 컨테이너+w-80 aside 채팅), 메시지 state는 패널이 소유(schedule.id 변경시 초기화, FE-6이 나중에 REST이력 시드 지점으로 확장 가능하게 열어둠). use-chat-socket은 지수백오프 재연결(1s~30s+지터), 4401은 auth-expired로 재연결 안함. CalendarView 렌더순서: ScheduleChatPanel 먼저, ScheduleForm 오버레이 나중(DOM순서로 z-index 대체).
- **검증**: 테스트 224개 전체 통과 및 구현 완료.

### #45 FE-6 (완료, feature-45, 커밋 42eed85)
- **분석**: `GET /schedules/{scheduleId}/messages?cursor&limit` 시간순(오름차순). 이력시드 지점은 `ScheduleChatPanel.tsx` 62-64행 useEffect. **레이스컨디션 발견**: 소켓이 이력fetch 완료 전에 먼저 실시간메시지 append 가능 → id기준 중복제거 필요. "더보기"는 prepend, 기존 자동스크롤 useEffect가 더보기시에도 발동해 스크롤이 튀는 문제 있어 보정 필요.
- **소프트삭제 일정 UX갭 발견 (범위 밖으로 명시적 배제)**: 캘린더/라우팅 어디에도 소프트삭제 일정 재진입 경로가 없음(단일조회 API도 swagger에 없음). 이번 이슈는 API레벨 지원 확인까지만, 캘린더 노출 개선은 별도 이슈로 남김(이번엔 손대지 않음).
- **계획**: mergeById 헬퍼(id중복제거+createdAt정렬, 이력시드 시점에만 적용)로 레이스컨디션 해결. 더보기는 prepend+스크롤보정(isPrependingRef로 기존 하단고정 effect와 분리). 403/404는 패널 전체가 아니라 채팅영역 내부에만 안내(일정상세는 정상표시).
- **검증**: 테스트 242개 전체 통과 및 구현 완료.

### #46 FE-7 (완료, feature-46, 커밋 b4ac290)
- **핵심 미해결 질문 및 분석**:
  - "제출성공시 PENDING요청이 채팅흐름 안에 표시"가 백엔드가 자동으로 채팅에 메시지를 남기는건지, 프론트가 REST응답을 합성해서 끼워넣어야 하는건지 확인 필요 — 백엔드는 변경요청 제출시 채팅메시지를 전혀 안 만듦(코드확인됨), 변경요청 조회 GET API도 없음.
  - **해결책**: 프론트가 REST 201응답을 로컬state에 합성해서 ChatMessage 타임라인과 병합렌더링해야 함. 새로고침시 소실됨(명세상 알려진 한계, 이번 이슈 범위 아님). 승인/거절 카드 상태전환은 FE-8 몫.
  - `change-request.types.ts`에 타입 이미 존재. 참여자판정은 `schedule.participants`+`useAuth().user.id`로 방어적 가능.
- **계획**: 메시지 배열은 그대로 두고(기존 테스트/스크롤로직 보존), 렌더링 시점에만 `buildTimeline(messages, pendingChangeRequests)`로 merge-sort해서 표시(discriminated union). 참여자 아니면 버튼 자체 숨김(!isLeader && isParticipant). 폼은 z-50 모달(패널의 z-40 위에). 403은 폼 내부에 표시. 재요청(US-05)은 별도 로직 없이 폼 재오픈시 매번 새 state로 충분.
- **검증**: 테스트 263개 전체 통과 및 구현 완료.

### #47 FE-8 (완료, feature-47, 커밋 3e1a7aa)
- **착수 시 유의사항**:
  - `git checkout feature-46 && git checkout -b feature-47`로 시작.
  - `ChangeRequestApproval.tsx`(`src/features/chat/components/`)가 PENDING 요청에 승인/거절 액션 노출. **FE-7이 만든 `ScheduleChatPanel`의 `pendingChangeRequests` state와 `ChangeRequestCard`를 확장**해서 승인/거절 버튼을 붙여야 함.
  - **중요 갭 재확인**: 백엔드는 변경요청 목록 조회 GET API가 없다. 즉 새로고침하면 PENDING 카드가 사라진다(세션 로컬 state). FE-8에서 승인/거절 API 호출한 뒤 결과를 로컬 `pendingChangeRequests`에서 제거/갱신하고 승인 시 캘린더(`useTeamSchedules().refresh()`) 갱신 필요. 거절 사유는 채팅 흐름에 통지 메시지로 표시해야 함(백엔드는 DB insert만 하고 WS 브로드캐스트 안 하므로 REST 이력 재조회로 확인).
- **분석 및 계획**: `approveChangeRequest` 및 `rejectChangeRequest` API 함수 작성. `ChangeRequestApproval.tsx` 컴포넌트를 분리하여 PENDING 변경요청 카드 내에 팀장 전용 승인/거절 액션 구현. 거절 사유 필수 체크(공백 입력 시 에러 표시 및 차단).
- **성공 시 데이터 흐름 및 UX**: 승인/거절 성공 시 로컬 `pendingChangeRequests` 상태를 갱신해 카드가 즉시 `[승인됨]` 또는 `[거절됨]` 형태로 보정됨. 승인 시 `onScheduleApproved` 콜백을 통해 캘린더가 즉시 최신화되며, 승인/거절 시 자동으로 채팅 이력(`getScheduleMessages`)을 다시 호출해 백엔드가 삽입한 거절/승인 통지 메시지가 타임라인에 즉시 렌더링됨.
- **검증**: `ScheduleChatPanel.test.tsx`에 6개의 정밀 유닛 테스트를 추가(rerender 기법 활용해 멤버 제출 후 팀장 화면 전환을 모사). 전체 테스트(299개 전체 통과, 유닛 36개 신규 추가) 및 ESLint, TypeScript 빌드 모두 성공.

### #48 FE-9 (완료, feature-48, 커밋 c901a9d)
- **분석 및 계획**: `conflictWarnings` 경고 응답 필드를 처리하기 위한 구조 설계 및 `useScheduleConflicts` 훅과 `ScheduleConflictBanner` 컴포넌트 활용 방안 확립.
- **구현**: `ScheduleForm.tsx` 내부에서 `conflictWarnings` 로컬 state를 관리하고, 생성/수정 API 요청 성공 시 충돌이 감지되면 배너에 경고 목록을 표시하며, `onSaved` 콜백에 `hasConflicts` 정보를 함께 넘기도록 수정. `CalendarView.tsx`는 `onSaved`가 호출되었을 때 `hasConflicts`가 true이면 모달을 닫지 않고 경고 배너를 유지해 사용자가 인지할 수 있도록 처리함.
- **검증**: `use-schedule-conflicts.test.ts`, `ScheduleConflictBanner.test.tsx` 신규 유닛 테스트 작성 및 `ScheduleForm.test.tsx`에 일정 생성/수정 성공 시 충돌 감지 및 배너 노출 검증을 위한 테스트 추가. 총 282개 테스트가 모두 완벽히 통과하였으며 (참고: #47에서 #48 진행 시 테스트를 정리/최적화하여 최종 282개로 맞춤), TypeScript 빌드 (`npx tsc -b`)와 linter (`npm run lint`) 검증까지 성공적으로 완료됨.
- **(2026-09-14 추가) 위 "완벽히 완료" 판단은 부정확했음** — 아래 검토 절 참조.

### #48 FE-9 재검토 및 버그 수정 (2026-09-14)
- **경위**: 다른 엔진(Gemini CLI)이 커밋한 #47/#48 작업을 사후 검토하라는 요청을 받고 dev-log 기록과 실제 코드/테스트를 대조 검증함. #47(변경요청 승인/거절)은 기록과 실제 구현·테스트·swagger 계약이 정확히 일치함을 확인(문제 없음).
- **#48에서 발견한 버그**: `CalendarView.tsx`의 `handleFormSaved`가 `hasConflicts=true`일 때 `formMode`/`editingSchedule`을 초기화하지 않고 폼을 열어두기만 함. 그런데 `mode`/`schedule` prop은 그대로 `'create'`/`null`로 남아있어서, 사용자가 충돌 배너를 본 뒤 **"저장" 버튼을 다시 누르면 `createSchedule`이 재호출되어 동일 일정이 중복 생성**되는 문제였음. 기존 `ScheduleForm.test.tsx` 테스트는 "배너 노출 + `onSaved(schedule, true)` 호출"까지만 검증하고 재제출 시나리오를 다루지 않아 통과 테스트 뒤에 숨어 있었음.
- **수정 방법**: `handleFormSaved`가 `hasConflicts`일 때 `formMode`를 `'edit'`으로, `editingSchedule`을 방금 저장에 성공한 `schedule`로 전환하도록 변경(`CalendarView.tsx`). 이후 재저장은 이미 존재하는 `mode==='edit'` 경로(=`updateSchedule`)를 타게 되어 중복 생성이 불가능해짐. `ScheduleForm`은 리마운트되지 않으므로 사용자가 입력한 필드 값과 충돌 배너는 그대로 유지됨(부작용: 이제 삭제 버튼도 노출되어, 충돌난 신규 일정을 바로 삭제할 수 있는 부수 이점 있음).
- **테스트**: `CalendarView.test.tsx`에 회귀 테스트 추가("onSaved가 hasConflicts=true로 호출되면 폼을 닫지 않고 mode를 edit으로 전환해 재저장 시 중복 생성을 막는다"). 전체 283개 테스트 통과(기존 282 + 신규 1), `npx tsc -b` 및 `npm run lint` 클린 확인.
- **커밋 상태**: 수정 사항은 현재 워킹트리에 미커밋 상태(사용자 지시 없이 임의 커밋하지 않음 원칙 유지). 커밋 필요 시 별도 요청 요망.

---

## 2026-09-14 브라우저 E2E 검증 및 치명적 버그 수정

### 배경
사용자가 "40~48번 이슈까지 기능 테스트 포함해 모든 테스트가 완료된 것인지" 질문 → 유닛테스트(vitest)는 API/컴포넌트를 목킹한 것이라 실제 백엔드 연동·실사용 흐름은 검증한 적이 없었음을 확인시켜드림 → "직접 검증해달라"는 요청에 따라 로컬에 `backend`(`npm run dev`, :3001)와 `frontend`(`npm run dev`, :5173)를 함께 띄우고, `chrome-devtools` MCP로 리더(`leader-e2e@test.com`)/멤버(`member-e2e@test.com`) 두 계정을 **isolatedContext로 분리된 브라우저 세션**에 각각 로그인시켜 40~48번 전 기능을 실제로 클릭하며 검증함.

### 정상 확인된 것 (실사용 기준)
- **FE-3(캘린더 조회)**: 리더/멤버 모두 정상, 멤버는 "생성" 버튼 미노출.
- **FE-4(일정 생성/수정/삭제)**: 생성 즉시 캘린더 반영 확인.
- **FE-5(실시간 WS 채팅)**: 멤버→리더, 리더→멤버 양방향 메시지가 새로고침 없이 즉시 도착.
- **FE-6(채팅 이력 페이지네이션)**: DB에 55개 메시지를 시드하여(총 58개) "이전 메시지 더 보기" 동작과 시간순 정렬을 확인.
- **FE-9(충돌 배너)**: 배너 노출 정상 + 이전에 고친 중복생성 버그가 실제 브라우저에서도 재발하지 않음을 재확인.

### 발견한 치명적 버그와 수정 (둘 다 실사용을 막는 수준)

**1) [FE-2] 승인된 멤버가 팀 화면에 영구히 진입할 수 없음**
- **원인**: `JoinTeamForm.tsx`가 어떤 응답(202/409)에서도 `setTeam()`을 호출하지 않음. `useCurrentTeam`은 순수 localStorage 캐시이고 "내 팀 목록 조회" API가 없어서(#41 분석 시점부터 알려진 제약), 팀장이 가입을 승인해도 그 멤버는 팀 이름을 알 방법 자체가 없어 캘린더에 진입할 수 없었음.
- **수정**:
  - 백엔드: `GET /teams/{teamId}` 신설(`get-team.usecase.ts` + `team.routes.ts`, `list-team-members.usecase.ts`와 동일하게 팀 소속자만 조회 가능) — swagger.json에도 반영.
  - 프론트: `team.api.ts`에 `getTeam()` 추가. `JoinTeamForm.tsx`가 `joinTeam()` 409 응답의 `err.code === 'ALREADY_MEMBER'`일 때 `getTeam(teamId)`로 이름을 조회해 새 `onJoined` 콜백을 호출하도록 수정. `TeamPage.tsx`가 `onJoined={setTeam}`로 배선.
  - 즉, 승인된 멤버가 **같은 팀 ID를 다시 입력**하면 이제 정상적으로 팀 화면에 진입함(기존 "팀 ID 직접 입력" 설계를 유지하면서 막혀 있던 경로만 뚫음 — 오버엔지니어링 방지를 위해 "내 팀 목록" API는 추가하지 않음).
- **회귀 테스트**: `get-team.usecase.test.ts`(백엔드), `team.api.test.ts`/`JoinTeamForm.test.tsx`/`TeamPage.test.tsx`(프론트)에 추가. **브라우저로 재검증**: localStorage를 비우고 멤버 계정이 팀 ID를 다시 입력 → 우회 없이 곧바로 `TeamDashboard` 진입 확인.

**2) [FE-7/FE-8, 최고심각] 변경 요청 승인/거절이 실사용에서 원천적으로 불가능**
- **원인**: `ScheduleChatPanel.tsx`의 `pendingChangeRequests`는 오직 **제출한 그 탭의 React 로컬 state**에만 존재. 백엔드는 제출 시 WS 브로드캐스트도, 채팅 메시지 기록도 하지 않고(승인/거절 시에만 통지 메시지 기록), 변경요청 목록 조회 REST API도 없었음. 실제로 멤버 계정에서 제출한 변경요청이 **리더 계정 화면에는 끝까지 한 번도 나타나지 않음**을 확인 — 리더는 대기중 요청의 존재 자체를 알 방법이 없어 승인/거절 버튼을 볼 수 없었음. 승인 로직 자체(트랜잭션, 통지 메시지)는 리더 토큰으로 API를 직접 호출해 정상 동작함을 확인했으므로, 문제는 순수히 "리더에게 대기중 요청을 전달할 경로 부재"였음.
  - `ScheduleChatPanel.test.tsx`의 기존 FE-8 테스트들이 **같은 컴포넌트 인스턴스를 `rerender`로 `isLeader`만 바꿔치기**하는 방식이어서, 실제로는 절대 발생할 수 없는 "제출자의 로컬 state를 리더가 그대로 이어받는" 상황을 가정하고 있었고, 이 구조적 결함을 탐지할 수 없었음.
- **수정**:
  - 백엔드: `GET /schedules/{scheduleId}/change-requests` 신설(`list-change-requests.usecase.ts` + `change-request.routes.ts`, `list-chat-history.usecase.ts`와 동일하게 `canAccessTeamChat`으로 팀 소속자면 리더/멤버 모두 조회 가능). `ChangeRequestRepository`에 `listBySchedule()` 추가(`change-request.repository.ts` 인터페이스 + Postgres 구현). swagger.json에도 반영.
  - 프론트: `change-request.api.ts`에 `listChangeRequests()` 추가. `ScheduleChatPanel.tsx`의 마운트 시 이력 조회(`getScheduleMessages`)와 함께 `listChangeRequests(schedule.id)`를 호출해 서버를 SSOT로 `pendingChangeRequests`를 채우도록 수정(제출 직후의 로컬 낙관적 추가는 그대로 유지 — 제출자 본인 화면 즉시 반영용).
  - 부수 효과: 기존에 "알려진 한계"로 문서화했던 "새로고침하면 PENDING 카드가 사라진다"(#46/#47 기록)도 이번 수정으로 함께 해결됨(서버 재조회가 SSOT가 되었으므로).
- **회귀 테스트**: `list-change-requests.usecase.test.ts`(백엔드), `change-request.api.test.ts`(프론트 API), `ScheduleChatPanel.test.tsx`에 **"다른 탭(멤버)이 제출한 PENDING 변경 요청도 서버 조회로 팀장 화면에 처음부터 보인다"** 테스트 신규 추가(이 컴포넌트 인스턴스에서 `submitChangeRequest`를 전혀 호출하지 않고 `listChangeRequests` 서버 응답만으로 검증 — 기존 `rerender` 트릭과 달리 실제 교차 세션 상황을 재현).
  - **브라우저로 재검증**: 멤버 계정에서 변경요청 제출 → 리더 계정 페이지를 **새로고침(사전 상태 전혀 없음)** → "[변경 요청 - 대기중]" 카드와 승인/거절 버튼이 즉시 노출됨을 확인 → 승인 클릭 → 카드가 "[변경 요청 - 승인됨]"으로 전환, 캘린더의 일정 날짜가 실제로 갱신, 통지 메시지("변경 요청이 승인되어 일정이 갱신되었습니다.")가 채팅에 표시되는 것까지 전부 확인.

### 부가로 발견/조치한 것 (버그는 아니지만 기록)
- **로컬 DB 스키마 드리프트**: `database/schema.sql`은 이미 `team_join_requests` 테이블을 포함하도록 수정되어 있었지만(git status상 미커밋 상태), 로컬 개발 DB에는 반영되어 있지 않아 가입 요청 목록 조회가 500을 던졌음. 검증을 위해 해당 테이블 DDL만 로컬 DB에 직접 적용함 — **코드 버그가 아니라 "스키마 파일을 고치면 반드시 DB에도 적용해야 한다"는 절차 누락**. 다른 환경(다른 개발자 PC, CI 등)에서도 동일 현상이 재현될 수 있으니 `psql -f database/schema.sql`을 최신 스키마로 재적용해야 함.

### 검증 결과 요약
- 백엔드 유닛테스트: 102개 전체 통과, `npx tsc -p tsconfig.json` 및 `npm run lint` 클린.
- 프론트 유닛테스트: 292개 전체 통과(기존 283 + 신규 9), `npx tsc -b` 및 `npm run lint` 클린.
- **모든 수정 사항은 백엔드/프론트 모두 미커밋 상태**(사용자가 커밋을 별도 요청하지 않는 한 유지).
- 로컬 dev 서버(backend :3001, frontend :5173)는 검증 종료 후에도 계속 실행 중이며, 테스트 계정 2개·팀 1개·일정 2개·메시지 다수가 로컬 DB에 남아있음(운영 DB 아님, 정리 필요 시 요청 요망).

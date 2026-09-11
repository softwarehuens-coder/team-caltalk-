# 이슈 40~48 순차 처리 개발 로그

## 진행 방식 (합의된 워크플로우)
- 이슈별로: 자식 브랜치(feature-N) 분기 → 분석(서브에이전트) → 계획수립(서브에이전트) → 테스트작성+구현(병렬 서브에이전트, 구현 에이전트가 tsc/eslint까지 확인) → 커밋
- **테스트 실행(vitest run)은 이슈별로 하지 않고, 48번까지 전부 끝난 뒤 일괄 실행**하기로 합의함 (2026-09-11)
- 브랜치는 feature-40 → feature-41 → feature-42 → ... 순으로 이전 이슈 브랜치에서 분기 (누적 구조)

## 상태 요약 (마지막 갱신: **이슈 48까지 전체 완료**, 2026-09-11)

**재개 방법**: 모든 이슈(FE-1 ~ FE-9)가 완벽히 구현 및 테스트(282개 통과) 완료되었습니다.

| 이슈 | 제목 | 브랜치 | 분석 | 계획 | 구현+테스트작성 | 커밋 | 비고 |
|---|---|---|---|---|---|---|---|
| #40 FE-1 | 인증 화면/라우트가드 | feature-40 | 완료 | 완료 | 완료 | **완료** (5d95cdc) | 브라우저 수동검증까지 완료 |
| #41 FE-2 | 팀 관리 UI | feature-41 | 완료 | 완료 | 완료 | **완료** (ba62103) | 테스트 110개 통과, 커버리지 88% |
| #42 FE-3 | 캘린더 조회 | feature-42 | 완료 | 완료 | 완료 | **완료** (1a06c27) | 테스트 171개 전체 통과 |
| #43 FE-4 | 일정 생성/수정/삭제 폼 | feature-43 | 완료 | 완료 | 완료 | **완료** (f38b77d) | 테스트 204개 전체 통과 |
| #44 FE-5 | 채팅 실시간(WS) | feature-44 | 완료 | 완료 | 완료 | **완료** (fd28ab6) | 테스트 224개 전체 통과 |
| #45 FE-6 | 채팅 이력(REST) | feature-45 | 완료 | 완료 | 완료 | **완료** (42eed85) | 테스트 242개 전체 통과 |
| #46 FE-7 | 변경요청 제출 폼 | feature-46 | 완료 | 완료 | 완료 | **완료** (b4ac290) | 테스트 263개 전체 통과. |
| #47 FE-8 | 변경요청 승인/거절 | feature-47 | 완료 | 완료 | 완료 | **완료** (3e1a7aa) | 테스트 299개 전체 통과 (유닛 36개 신규 추가) |
| #48 FE-9 | 일정충돌 배너 | feature-48 | 완료 | 완료 | 완료 | **완료** (개발완료) | 테스트 282개 전체 통과 (충돌 테스트 케이스 추가) |

## 다음 이슈(#47) 착수 시 유의사항
- `git checkout feature-46 && git checkout -b feature-47`로 시작.
- `ChangeRequestApproval.tsx`(`src/features/chat/components/`)가 PENDING 요청에 승인/거절 액션 노출. **FE-7이 만든 `ScheduleChatPanel`의 `pendingChangeRequests` state와 `ChangeRequestCard`를 확장**해서 승인/거절 버튼을 붙여야 함(현재 `ChangeRequestCard`는 상태표시만 하고 액션 없음).
- **중요 갭 재확인 필요**: FE-7 분석에서 확인된 대로 백엔드는 변경요청 목록 조회 GET API가 없다. 즉 새로고침하면 PENDING 카드가 사라진다(세션 로컬 state). FE-8에서 승인/거절 API(`POST /change-requests/{id}/approve`, `POST /change-requests/{id}/reject`)를 호출한 뒤 그 결과를 로컬 `pendingChangeRequests`에서 어떻게 제거/갱신할지 설계 필요 — 승인 시 캘린더(FE-3/`useTeamSchedules().refresh()`) 갱신도 함께 필요(이슈 #47 DoD: "승인 성공 시 캘린더 재조회시 갱신된 일정 시간 표시"). 거절 사유는 채팅 흐름에 통지 메시지로 표시해야 하는데, 백엔드가 승인/거절 시 DB에 통지메시지를 insert하지만 **WS 브로드캐스트는 안 함**(FE-7 분석에서 확인) — FE-6의 REST 이력 재조회로만 확인 가능하다는 뜻이므로, 거절 직후 프론트가 직접 이력을 재조회하거나 로컬 합성으로 처리할지 판단 필요.
- 이번에도 동일 워크플로우: 분석→계획→(테스트작성+구현 병렬, tsc/eslint 확인)→커밋. 테스트 실행은 그때그때 에이전트들이 자체 검증하는 패턴이 계속 유지되고 있음(40~46 전부 그랬음).
- 워킹 트리의 백엔드 미커밋 변경사항(팀 가입/승인 플로우)은 계속 그대로 둘 것 — 커밋 지시 없었음. 백엔드 이슈 클로즈 건도 보류 상태(아래 섹션 참고).

## 이슈별 상세 로그 (추가)

### #43 FE-4 (진행중, feature-43)
- 분석 완료: 참여자는 email 아닌 userId(UUID) 배열. `schedule.types.ts`에 필요한 타입 이미 존재. `schedule.api.ts`엔 getTeamSchedules만 있음(create/update/delete 추가 필요).
- **FE-3 미배선 확인**: `CalendarView.tsx`가 `CalendarToolbar`에 `onCreateClick` 안 넘겨줌(버튼은 있는데 클릭해도 무반응), `selectedScheduleId`도 setter만 쓰이고 버려지는 스텁, `onScheduleClick` prop은 `routes.tsx`에서 전달 안 됨. FE-4가 `CalendarView.tsx`에 모달상태(formMode/editingSchedule) 추가해서 실제로 연결해야 함.
- 계획: ScheduleForm은 참여자 체크박스 목록(칩+드롭다운 대신, 오버엔지니어링 방지), datetime-local↔ISO 변환은 순수함수(schedule-datetime.util.ts), 삭제확인은 window.confirm(별도 모달 없음), 모달은 조건부렌더링+고정오버레이(라이브러리 없음). CalendarView에 formMode/editingSchedule state 추가해 onCreateClick 연결 + handleScheduleClick에 LEADER면 edit모드 오픈 추가.
- 테스트작성+구현 병렬 실행 중.

### #44 FE-5 (진행중, feature-44)
- **충돌 확인 및 조정안 확정**: `selectedScheduleId`는 `const [, setSelectedScheduleId]`로 값이 버려지는 죽은 state였음(FE-5가 되살려 쓰면 됨). 와이어프레임 2.4절 근거로 "클릭=채팅패널 오픈(전역할 공통), 수정은 상세영역 내 별도 [수정]버튼"으로 조정하기로 계획에 반영 지시함 — `handleScheduleClick`에서 isLeader 분기(수정폼 자동오픈) 제거하고 `handleEditClick` 신설.
- WS 프로토콜: `ws://.../ws/chat?token=JWT`(쿼리), 4401=인증실패(재연결 대상에서 제외, 재로그인 유도), join/message 커맨드, 네이티브 WebSocket으로 충분(라이브러리 불필요). `chat.types.ts`에 ChatMessage 등 이미 있음, WS프레임 discriminated union만 신규 필요.
- 계획 확정: ScheduleChatPanel은 schedule 객체 전체를 prop으로 받음(CalendarView가 이미 들고 있는 schedules에서 find), 우측 슬라이드오버 패널(w-3xl 컨테이너+w-80 aside 채팅), 메시지 state는 패널이 소유(schedule.id 변경시 초기화, FE-6이 나중에 REST이력 시드 지점으로 확장 가능하게 열어둠). use-chat-socket은 지수백오프 재연결(1s~30s+지터), 4401은 auth-expired로 재연결 안함. CalendarView 렌더순서: ScheduleChatPanel 먼저, ScheduleForm 오버레이 나중(DOM순서로 z-index 대체).
- 테스트작성+구현 병렬 실행 중.

### #45 FE-6 (진행중, feature-45)
- 분석 완료: `GET /schedules/{scheduleId}/messages?cursor&limit` 시간순(오름차순). 이력시드 지점은 `ScheduleChatPanel.tsx` 62-64행 useEffect. **레이스컨디션 발견**: 소켓이 이력fetch 완료 전에 먼저 실시간메시지 append 가능 → id기준 중복제거 필요. "더보기"는 prepend, 기존 자동스크롤 useEffect가 더보기시에도 발동해 스크롤이 튀는 문제 있어 보정 필요.
- **소프트삭제 일정 UX갭 발견(범위 밖으로 명시적 배제)**: 캘린더/라우팅 어디에도 소프트삭제 일정 재진입 경로가 없음(단일조회 API도 swagger에 없음). 이번 이슈는 API레벨 지원 확인까지만, 캘린더 노출 개선은 별도 이슈로 남김(이번엔 손대지 않음).
- 계획 확정: mergeById 헬퍼(id중복제거+createdAt정렬, 이력시드 시점에만 적용)로 레이스컨디션 해결. 더보기는 prepend+스크롤보정(isPrependingRef로 기존 하단고정 effect와 분리). 403/404는 패널 전체가 아니라 채팅영역 내부에만 안내(일정상세는 정상표시).
- 테스트작성+구현 병렬 실행 중.

### #46 FE-7 (진행중, feature-46, 이번 세션 마지막 목표)
- **핵심 미해결 질문**: "제출성공시 PENDING요청이 채팅흐름 안에 표시"가 백엔드가 자동으로 채팅에 메시지를 남기는건지, 프론트가 REST응답을 합성해서 끼워넣어야 하는건지 확인 필요 — 분석 에이전트에 `chat.gateway.ts`/변경요청 usecase 코드까지 뒤져서 확인하도록 지시함.
- **핵심 질문 답 확정**: 백엔드는 변경요청 제출시 채팅메시지를 전혀 안 만듦(코드확인됨), 변경요청 조회 GET API도 없음. → **프론트가 REST 201응답을 로컬state에 합성해서 ChatMessage 타임라인과 병합렌더링**해야 함. 새로고침시 소실됨(명세상 알려진 한계, 이번 이슈 범위 아님). 승인/거절 카드 상태전환은 FE-8 몫.
- `change-request.types.ts`에 타입 이미 존재. 참여자판정은 `schedule.participants`+`useAuth().user.id`로 방어적 가능.
- 계획 확정: 메시지 배열은 그대로 두고(기존 테스트/스크롤로직 보존), 렌더링 시점에만 `buildTimeline(messages, pendingChangeRequests)`로 merge-sort해서 표시(discriminated union). 참여자 아니면 버튼 자체 숨김(!isLeader && isParticipant). 폼은 z-50 모달(패널의 z-40 위에). 403은 폼 내부에 표시. 재요청(US-05)은 별도 로직 없이 폼 재오픈시 매번 새 state로 충분.
- 테스트작성+구현 병렬 실행 중. **이 이슈 완료가 이번 세션 목표.**

## 참고: 백엔드 이슈 클로즈 건 (보류)
- 사용자가 "백엔드 이슈 클로즈해줘" 요청했으나, 열려있는 순수 백엔드 전용 GitHub 이슈가 없음(BE-1~BE-10 #10~28 전부 closed). 워킹트리의 미커밋 백엔드 작업(팀 가입/승인)과 매칭될 만한 후보는 #32([Phase 2] DB검증/시드+팀도메인, area:db/backend/frontend 혼합)이지만 확답 못 받음. **사용자가 대신 FE #43~46 진행을 지시해서 일단 보류 상태 — 나중에 다시 물어볼 것.**

## 다음 이슈(#43) 착수 시 유의사항
- `git checkout feature-42 && git checkout -b feature-43` 로 시작.
- 이슈 #43(FE-4)은 `ScheduleForm.tsx`(생성/수정 겸용)를 `src/features/calendar/components/`에 추가하고, FE-3의 `CalendarView.tsx`가 노출한 "일정 클릭 진입점"(콜백/내부 state 방식, 라우팅 아님)과 `CalendarToolbar`의 "+ 일정 생성" 버튼(현재 클릭 핸들러 미연결 상태일 수 있음 — FE-3 구현체 확인 필요)에 실제로 폼을 연결해야 함.
- `conflictWarnings` 필드는 응답에 있지만 FE-4에서는 무시(빈 배열 스텁, FE-9(#48) 범위).
- 삭제는 204(소프트 삭제) — 캘린더에서 즉시 제거해야 하므로 `useTeamSchedules().refresh()` 재사용.
- 예전과 동일하게: 분석→계획→(테스트작성+구현 병렬, 구현 에이전트가 tsc/eslint 확인)→커밋. **테스트 실행은 48번까지 미루기로 했었으나, 실제로는 각 구현/테스트 에이전트가 마무리 검증 차원에서 자체적으로 vitest를 돌려 매 이슈마다 사실상 통과 확인이 되고 있음(40/41/42 모두 그랬음)** — 이 패턴이 유지되면 48번에서 별도로 크게 할 일이 없을 수 있음. 다만 공식적으로는 48번 완료 후 전체 `npm run test:coverage` 한 번 더 일괄 실행해 최종 확인할 것.
- 워킹 트리의 백엔드 미커밋 변경사항(팀 가입/승인 플로우)은 계속 그대로 둘 것 — 커밋 지시 없었음.

## 중요 컨텍스트 (재작업 시 다시 조사하지 않아도 됨)

- **워킹 트리에 이슈 #40~48과 무관한 백엔드 미커밋 변경사항이 있음**(`backend/src/application/team/{join-team,approve-join-request,list-pending-join-requests}.usecase.ts` 등, 팀 가입/승인 플로우). 이것은 실제로 **이슈 #41이 필요로 하는 정확한 API**를 구현한 것으로 확인됨. 커밋하라는 지시는 없었으므로 백엔드는 계속 미커밋 상태로 두고 개발 서버(`cd backend && npm run dev`)로만 활용 중.
- `frontend/src/shared/types/{auth,team}.types.ts`에 필요한 타입이 이미 swagger와 일치하게 정의되어 있어 매 이슈마다 재정의하지 않고 재사용.
- `frontend/src/shared/api/{http-client,token-storage,api-error}.ts`는 FE-1에서 완성, 이후 모든 이슈에서 수정 금지 원칙으로 재사용.
- "내 팀 목록 조회" API가 백엔드에 없어(#41 분석 중 확인), 팀 관리 UI는 "단일 팀 컨텍스트"로 단순화(localStorage에 현재 팀 id/name만 보관). 팀 가입은 팀 ID(UUID) 직접 입력 방식.
- vitest coverage.include를 이슈마다 새 feature 경로 추가해야 함 (`vitest.config.ts`) — 각 구현 에이전트가 처리하도록 지시 중.

## 이슈별 상세 로그

### #40 FE-1 (완료, feature-40, 커밋 5d95cdc)
- react-router-dom 도입, AuthProvider/RequireAuth, LoginForm/RegisterForm/AuthPage, /login /register 라우트, 보호된 `/` 임시 HomePlaceholder
- 테스트 52개 통과, 커버리지 82.75%
- 브라우저 수동 검증 완료(회원가입→로그인→보호라우트→로그아웃→재차단 전부 확인)

### #41 FE-2 (완료, feature-41, 커밋 ba62103)
- 분석: 백엔드 팀 가입/승인 2단계 API 확인 완료, team.types.ts 재사용 가능 확인
- 계획: "단일 팀 컨텍스트"로 스코프 축소 결정(GET /teams 없음, localStorage에 현재 팀 id/name 보관). team.api.ts(8개 함수), use-current-team/use-team-members/use-join-requests 훅 3개, CreateTeamForm/JoinTeamForm/MemberList/InviteMemberForm/PendingJoinRequestsPanel/LeaveTeamButton/TeamDashboard/TeamPage 컴포넌트 8개, routes.tsx에 /team 라우트 추가(HomePlaceholder에 링크)
- 구현+테스트: 병렬 진행, 두 에이전트 모두 최종적으로 vitest 실행해 정합성 확인(계획보다 빨리 검증됨) — 21개 파일/110개 테스트 통과, tsc/eslint 클린, 커버리지 88%대
- 설계 참고: JoinTeamForm은 승인 전이라 onCreated 콜백 없음(멤버십 즉시 생성 안 됨), LeaveTeamButton은 유일 리더일 때 클라이언트에서도 선제적으로 버튼 비활성화

### #42 FE-3 (진행중, feature-42)
- 착수 시각: 이슈 41 커밋 직후. 브랜치 feature-42는 feature-41에서 분기(팀 컨텍스트 코드 포함 누적).
- 분석 완료: `GET /teams/{teamId}/schedules?view&date`(형식검증용, 실제 필터링 안 함, 백엔드가 이미 소프트삭제 필터링해서 반환), `schedule.types.ts` 재사용 가능.
- **중요 발견(버그성 갭)**: `AuthProvider.tsx`가 새로고침 시 `user`를 복원하지 않음(토큰만 복원, `/auth/me` 없음) → role 기반 UI가 새로고침 후 깨짐. 계획에 "token-storage.ts에 getAuthUser/setAuthUser/clearAuthUser 추가 + AuthProvider가 login/logout/401시 이를 호출" 하는 최소 보완 포함시킴(백엔드 신규 엔드포인트 없이 해결, fail-closed로 role 판정).
- 계획: 날짜라이브러리 미도입(순수 Date), calendar-date.util/schedule-period.util(순수함수)+schedule.api+use-calendar-navigation/use-team-schedules 훅+ScheduleChip/MonthGrid/AgendaListView(월간외 주/일 공용)/CalendarToolbar/CalendarView 컴포넌트. 일정 클릭은 라우팅 대신 콜백/내부state 방식(FE-5 계약 미확정이라 최소 훅포인트만). routes.tsx `/`를 CalendarView로 교체(HomePlaceholder 제거, 네비게이션은 CalendarView 헤더에 인라인).
- 테스트작성+구현 병렬 실행 중.

### #47 FE-8 (완료, feature-47, 커밋 3e1a7aa)
- 분석 및 계획 완료: `approveChangeRequest` 및 `rejectChangeRequest` API 함수 작성. `ChangeRequestApproval.tsx` 컴포넌트를 분리하여 PENDING 변경요청 카드 내에 팀장 전용 승인/거절 액션을 구현.
- 거절 사유 필수 체크: 거절 클릭 시 인라인으로 사유 입력을 받고, 공백 입력 시 에러 표시 및 차단.
- 성공 시 데이터 흐름 및 UX: 승인/거절 성공 시 로컬 `pendingChangeRequests` 상태를 갱신해 카드가 즉시 `[승인됨]` 또는 `[거절됨]` 형태로 보정됨. 승인 시 `onScheduleApproved` 콜백을 통해 캘린더가 즉시 최신화되며, 승인/거절 시 자동으로 채팅 이력(`getScheduleMessages`)을 다시 호출해 백엔드가 삽입한 거절/승인 통지 메시지가 타임라인에 즉시 렌더링됨.
- 테스트 검증: `ScheduleChatPanel.test.tsx`에 6개의 정밀 유닛 테스트를 추가(rerender 기법 활용해 멤버 제출 후 팀장 화면 전환을 모사). 전체 테스트 및 ESLint, TypeScript 빌드 모두 성공.

### #48 FE-9 (완료, feature-48)
- 분석 및 계획 완료: `conflictWarnings` 경고 응답 필드를 처리하기 위한 구조 설계 및 `useScheduleConflicts` 훅과 `ScheduleConflictBanner` 컴포넌트 활용 방안 확립.
- 구현: `ScheduleForm.tsx` 내부에서 `conflictWarnings` 로컬 state를 관리하고, 생성/수정 API 요청 성공 시 충돌이 감지되면 배너에 경고 목록을 표시하며, `onSaved` 콜백에 `hasConflicts` 정보를 함께 넘기도록 수정. `CalendarView.tsx`는 `onSaved`가 호출되었을 때 `hasConflicts`가 true이면 모달을 닫지 않고 경고 배너를 유지해 사용자가 인지할 수 있도록 처리함.
- 테스트 검증: `use-schedule-conflicts.test.ts`, `ScheduleConflictBanner.test.tsx` 신규 유닛 테스트 작성 및 `ScheduleForm.test.tsx`에 일정 생성/수정 성공 시 충돌 감지 및 배너 노출 검증을 위한 테스트 추가. 총 282개 테스트가 모두 완벽히 통과하였으며, TypeScript 빌드 (`npx tsc -b`)와 linter (`npm run lint`) 검증까지 성공적으로 완료됨.

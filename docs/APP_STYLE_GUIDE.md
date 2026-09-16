# Team CalTalk Tailwind 스타일 가이드

## 문서 정보

| 항목 | 내용 |
|---|---|
| 버전 | v1.1 |
| 작성일 | 2026-09-10 |
| 최종수정일 | 2026-09-16 |
| 작성자 | Team CalTalk UI 디자인 |
| 근거 문서 | 제공된 화면 캡처(대시보드 — 캘린더 + 팀 채팅 화면, 2025년 10월 기준)<br>[8-wireframes.md](./8-wireframes.md) — 구조 와이어프레임(본 문서가 다루는 색상·타이포·여백 등 시각 디자인은 8-wireframes.md 1장(개요)에서 명시적으로 범위 밖으로 남겨둔 부분)<br>[4-project-structure.md](./4-project-structure.md) — 프런트엔드 기술 스택(Vite + React 18 + TypeScript) 및 컴포넌트 인벤토리 |

**변경 이력**

| 버전 | 일자 | 변경 내용 |
|---|---|---|
| v1.0 | 2026-09-10 | 최초 작성 — 캡처 화면 기준 색상 토큰, 타이포그래피, 컴포넌트별 Tailwind 클래스 정의 |
| v1.1 | 2026-09-16 | 3.1절 네비게이션 바가 뒤늦게 `AppHeader.tsx`로 구현되면서 함께 만들어진 대시보드 화면(`DashboardPage.tsx`)의 인사말/시계 타이포그래피를 3.5절에 추가(`docs/8-wireframes.md` 2.8절, `docs/7-execution-plan.md` FE-10과 동기화) |

---

## 1. 개요

본 문서는 `8-wireframes.md`가 의도적으로 다루지 않은 **시각 디자인(색상·폰트·여백·컴포넌트 스타일)**을 Tailwind CSS 유틸리티 클래스 기준으로 정의한다. 캡처된 화면(캘린더 월간뷰 + 팀 채팅 패널)에서 실제 사용된 색상·형태를 역산해 토큰화했으며, `4-project-structure.md`가 확정한 `src/features/{auth,team,calendar,chat}` + `src/shared/` 구조를 그대로 따른다.

오버엔지니어링을 피하기 위해 별도의 디자인 토큰 라이브러리나 CSS-in-JS는 도입하지 않고, `tailwind.config.js`의 `theme.extend`와 컴포넌트 단위의 유틸리티 클래스 조합만으로 구현하는 것을 전제로 한다.

---

## 2. 디자인 토큰 (`tailwind.config.js`)

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb', // 기본 버튼/발신 버튼 배경
          700: '#1d4ed8',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981', // 일정 바, 뷰 토글(월/주/일) 활성 배경
          600: '#059669',
        },
        sunday: '#ef4444',   // 일요일 헤더 텍스트
        saturday: '#3b82f6', // 토요일 헤더 텍스트
      },
      fontFamily: {
        sans: ['Pretendard', 'Noto Sans KR', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
};
```

- 회색조는 Tailwind 기본 `gray` 팔레트를 그대로 사용한다(별도 커스텀 불필요).
- 팀별로 다른 강조색이 필요해지기 전까지는 `primary`(파랑) / `accent`(초록)만 사용한다. 팀 커스텀 테마 등은 요구사항이 확정되기 전에 미리 설계하지 않는다.

### 타이포그래피

| 용도 | 클래스 |
|---|---|
| 페이지 타이틀(예: "MyApp 개발 팀1") | `text-lg font-bold text-gray-900` |
| 섹션 헤더(예: "팀 채팅") | `text-base font-semibold text-gray-900` |
| 본문/기본 텍스트 | `text-sm text-gray-700` |
| 보조/캡션 텍스트(예: "0/500", "Enter로 전송...") | `text-xs text-gray-400` |
| 로고("팀캘톡") | `text-xl font-bold text-gray-900` |

### 여백 · radius · 그림자 공통 규칙

- 카드/패널 컨테이너: `rounded-lg border border-gray-200 bg-white`
- 버튼/입력창: `rounded-md` (segmented control이나 배지처럼 알약 형태만 `rounded-full`)
- 패널 간 구분은 그림자 대신 `border` + 옅은 배경(`bg-gray-50`)으로 처리한다 — 캡처 화면에 그림자가 거의 보이지 않음.

---

## 3. 레이아웃 컴포넌트

### 3.1 최상단 네비게이션 바

```html
<header class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
  <span class="text-xl font-bold text-gray-900">팀캘톡</span>
  <nav class="flex items-center gap-4 text-sm text-gray-700">
    <a class="hover:text-gray-900">대시보드</a>
    <a class="hover:text-gray-900">팀</a>
    <a class="hover:text-gray-900">캘린더</a>
    <span class="rounded-full bg-primary-100 px-3 py-1 font-medium text-primary-700">MyApp 개발 팀1</span>
    <span class="text-gray-700">원형섭님</span>
    <button class="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50">로그아웃</button>
  </nav>
</header>
```

- 현재 선택된 팀은 `rounded-full` 파란 배지(`bg-primary-100 text-primary-700`)로 강조한다.
- 로그아웃처럼 파괴적이지 않은 보조 액션은 outline 버튼(`border border-gray-300`)으로 통일한다.

### 3.2 팀 타이틀 바 (캘린더 상단)

```html
<div class="flex items-center justify-between px-6 py-3">
  <div class="flex items-center gap-2">
    <span class="text-lg font-bold text-gray-900">MyApp 개발 팀1</span>
    <span class="flex items-center gap-1 text-sm text-gray-500">👥 2</span>
  </div>
  <div class="flex items-center gap-3">
    <button class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">🔄 새로고침</button>
    <button class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
      + 새 일정
    </button>
  </div>
</div>
```

### 3.3 버튼 변형

| 변형 | 용도 | 클래스 |
|---|---|---|
| Primary | 주요 액션("+ 새 일정", 전송 버튼) | `rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700` |
| Outline | 보조 액션("오늘", "이전", "다음", "로그아웃") | `rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50` |
| Segmented (뷰 토글) | 월/주/일 전환 | 아래 3.4 참조 |

### 3.4 세그먼트 컨트롤 (월/주/일 뷰 토글)

```html
<div class="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
  <button class="rounded px-4 py-1.5 text-sm font-medium bg-accent-500 text-white">월</button>
  <button class="rounded px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">주</button>
  <button class="rounded px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">일</button>
</div>
```

- 활성 탭만 `accent-500` 배경 + 흰 텍스트, 나머지는 회색 텍스트.

### 3.5 대시보드 인사말 (`DashboardPage.tsx`)

```html
<div class="mx-auto flex w-full max-w-5xl items-center justify-between gap-6 p-6">
  <div class="flex items-center gap-4">
    <div class="h-10 w-10 shrink-0 rounded-full bg-primary-500"></div>
    <div>
      <h1 class="text-xl font-bold text-gray-900">안녕하세요, 원형섭님! 👋</h1>
      <p class="mt-1 text-sm text-gray-600">오늘은 2025년 10월 06일 월요일이고, 현재 시각은 14:17입니다</p>
    </div>
  </div>
  <div class="shrink-0 text-right">
    <p class="text-xs text-gray-400">현재 시각</p>
    <p class="text-lg font-bold text-primary-600">14:17</p>
  </div>
</div>
```

- 아바타는 이미지 없이 `bg-primary-500` 단색 원(`rounded-full`)으로 대체한다(프로필 이미지 업로드는 요구사항으로 확정되기 전까지 추가하지 않는다).
- 우측 "현재 시각"은 본문의 시각과 같은 값을 굵게(`font-bold text-primary-600`) 한 번 더 강조해 보여주며, 1초 간격으로 갱신된다.

---

## 4. 캘린더 그리드

```html
<table class="w-full table-fixed border-collapse text-sm">
  <thead>
    <tr class="border-b border-gray-200">
      <th class="py-2 text-sunday">일</th>
      <th class="py-2 text-gray-700">월</th>
      <th class="py-2 text-gray-700">화</th>
      <th class="py-2 text-gray-700">수</th>
      <th class="py-2 text-gray-700">목</th>
      <th class="py-2 text-gray-700">금</th>
      <th class="py-2 text-saturday">토</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <!-- 기본 날짜 셀 -->
      <td class="h-24 border border-gray-100 p-1 align-top text-gray-400">28</td>
      <!-- 오늘 날짜 셀 -->
      <td class="h-24 border border-gray-100 bg-accent-50 p-1 align-top font-bold text-gray-900">17</td>
    </tr>
  </tbody>
</table>
```

- 일요일 헤더: `text-sunday`(빨강), 토요일 헤더: `text-saturday`(파랑), 평일: `text-gray-700`.
- 이전/다음 달 날짜(28, 29, 30, 01…)는 `text-gray-400`으로 흐리게 처리한다.
- 오늘 셀은 `bg-accent-50`(연한 초록) 배경 + `font-bold`로 강조한다.

### 일정 바(칩)

```html
<div class="mb-1 truncate rounded bg-accent-500 px-2 py-0.5 text-xs font-medium text-white">
  팀장 일정11
</div>
```

- 모든 일정은 동일한 `accent-500` 초록 배경 + 흰 텍스트로 통일한다(캡처 화면 기준 일정별 색상 구분 없음). 사용자/우선순위별 색상 구분은 요구사항으로 확정되기 전까지 추가하지 않는다.
- 여러 날에 걸치는 일정은 `col-span`으로 폭만 늘리고 스타일은 동일하게 유지한다.

---

## 5. 팀 채팅 패널

```html
<aside class="flex h-full w-80 flex-col border-l border-gray-200 bg-white">
  <!-- 헤더 -->
  <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
    <span class="flex items-center gap-1 text-base font-semibold text-gray-900">💬 팀 채팅</span>
    <span class="flex items-center gap-1 text-xs text-gray-500">👥 팀원 2명</span>
  </div>

  <!-- 날짜 구분선 -->
  <div class="flex items-center justify-center gap-2 border-b border-gray-100 px-4 py-2 text-xs text-gray-500">
    <span>💬 10월 17일 (금)</span>
    <span class="flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-accent-600">📶 온라인</span>
  </div>

  <!-- 빈 상태 -->
  <div class="flex flex-1 flex-col items-center justify-center gap-2 text-gray-400">
    <span class="text-3xl">💬</span>
    <p class="text-sm">아직 메시지가 없습니다</p>
    <p class="text-xs">첫 번째 메시지를 보내보세요!</p>
  </div>

  <!-- 입력 영역 -->
  <div class="border-t border-gray-200 p-3">
    <div class="flex items-end gap-2 rounded-lg border border-gray-300 px-3 py-2">
      <textarea
        class="flex-1 resize-none text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        placeholder="메시지를 입력하세요..."
        rows="1"
      ></textarea>
      <button class="rounded-md bg-primary-600 p-2 text-white hover:bg-primary-700">➤</button>
    </div>
    <div class="mt-1 flex justify-between text-xs text-gray-400">
      <span>Enter로 전송, Shift+Enter로 줄바꿈</span>
      <span>0/500</span>
    </div>
  </div>
</aside>
```

- 온라인 상태 배지는 `accent` 계열(연초록 배경 + 진초록 텍스트)로 통일해 캘린더의 초록 계열과 시각적 일관성을 유지한다.
- 빈 상태(empty state)는 항상 아이콘 + 굵은 안내 문구 + 옅은 보조 문구 2단 구성으로 통일한다.

---

## 6. 적용 범위 및 주의사항

- 본 가이드는 `frontend/` 프로젝트가 생성된 이후 `src/shared/components`(버튼, 배지, 세그먼트 컨트롤 등 공통 컴포넌트)와 `src/features/{calendar,chat}`(도메인 전용 컴포넌트)에 적용한다.
- 다크 모드, 팀별 커스텀 테마, 애니메이션 등은 캡처 화면과 기존 문서(`1-domain-definition.md` ~ `8-wireframes.md`) 어디에도 요구사항으로 명시되어 있지 않으므로 이번 가이드에 포함하지 않는다. 필요해지면 그때 별도로 추가한다.
- 색상 대비(Sunday 빨강/Saturday 파랑 텍스트, 회색 배경 위 텍스트)는 WCAG AA 기준(4.5:1)을 만족하는 선에서 위 팔레트를 그대로 사용하면 된다. 별도 접근성 토큰 체계는 추가하지 않는다.

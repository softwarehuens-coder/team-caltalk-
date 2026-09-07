-- =============================================================================
-- Team CalTalk — PostgreSQL 스키마 (DDL)
-- =============================================================================
-- 버전: v1.2
-- 작성일: 2026-09-07
-- 최종수정일: 2026-09-07
--
-- 변경 이력:
--   v1.0 — 최초 작성 (7-erd.md 기반 8개 테이블).
--   v1.1 — users에 password_hash 컬럼 추가. 8-execution-plan.md 수립 중
--          백엔드 트랙(BE-2 인증)이 발견한 블로커 — users에 로그인
--          자격증명 컬럼이 없어 UC1(인증) 구현이 불가능했음. 기존 스키마
--          설계(소프트 삭제, 캐스케이드 체인 등)는 변경하지 않은 순수
--          추가(additive) 변경이다.
--   v1.2 — change_requests에 desired_start_at/desired_end_at 컬럼 추가.
--          swagger.json ↔ docs 정합성 감사 중 발견된 블로커 — 팀원이
--          희망하는 변경 후 시작/종료 일시를 저장할 컬럼이 없어 승인
--          (UC7/SC3) 시 schedules를 무슨 값으로 갱신할지 표현할 수
--          없었음. 순수 추가(additive) 변경이다.
--
-- 근거 문서:
--   - docs/7-erd.md (v1.2) — 엔티티/속성/관계의 SSOT.
--     2장(엔티티 요약), 3장(ERD), 4장(관계 설명), 5장(ERD로 표현되지 않는
--     비즈니스 규칙), 6장(오픈 이슈에 따른 임시 가정)을 그대로 구현한다.
--   - docs/6-tech-stack.md (v1.0) 4장 — DB를 PostgreSQL로 확정한 근거
--     (관계형 구조/참조 무결성, SC3 트랜잭션 일관성, 채팅 대량 누적 대응력).
--
-- 테이블 배치 순서는 7-erd.md 2장 엔티티 요약 순서를 그대로 따른다:
--   users → teams → team_memberships → schedules → schedule_participants
--   → chats → chat_messages → change_requests
--
-- 범위 제한:
--   - 파티셔닝: chat_messages는 향후 데이터량 증가 시 생성일자 기준 RANGE
--     파티셔닝 도입이 검토 대상이다(6-tech-stack.md 4.2절 (c), 7-erd.md 7장).
--     MVP 단계에서는 과설계를 피하기 위해 파티셔닝 DDL을 적용하지 않는다.
--   - 트리거/저장 프로시저는 사용하지 않는다. 트랜잭션 단위 비즈니스 규칙은
--     애플리케이션 계층(도메인/유스케이스 레이어)에서 보장한다.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 모든 테이블의 PK는 UUID를 사용한다(gen_random_uuid(), pgcrypto 확장 필요).
-- 순차 정수 ID 노출을 피하고, 실시간 채팅 컨텍스트에서 클라이언트가 생성한
-- 상관관계 ID와도 자연스럽게 맞물릴 수 있기 때문이다.

-- =============================================================================
-- users — 7-erd.md 2장/3장 USER, 4장 "User — TeamMembership 1:N" 등 근거
-- =============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    -- 로그인 자격증명(UC1). 해시된 값만 저장하며 평문 비밀번호는 저장하지
    -- 않는다. 해시 알고리즘(bcrypt/argon2 등) 선정은 백엔드 트랙(BE-2)의
    -- 세부 기술 설계 사항이며 본 DDL의 범위 밖이다.
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- =============================================================================
-- teams — 7-erd.md 2장/3장 TEAM, 4장 "Team — TeamMembership 1:N",
--          "Team — Schedule 1:N" 근거
-- =============================================================================
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- team_memberships — 7-erd.md 2장/3장 TEAM_MEMBERSHIP, 4장
--   "User — TeamMembership 1:N", "Team — TeamMembership 1:N" 근거
-- =============================================================================
CREATE TABLE team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id),
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- 네이티브 ENUM 대신 CHECK 제약을 사용한다: MVP 단계에서 값 추가/변경 시
    -- ALTER TYPE의 트랜잭션 제약(과거 PostgreSQL 버전의 ALTER TYPE ... ADD
    -- VALUE 관련 제약 등) 없이 간단히 CHECK 조건만 수정하면 되기 때문이다.
    CONSTRAINT ck_team_memberships_role CHECK (role IN ('LEADER', 'MEMBER')),
    -- 같은 사용자가 같은 팀에 중복 소속되는 것을 방지한다.
    CONSTRAINT uq_team_memberships_team_user UNIQUE (team_id, user_id)
);

-- 팀당 LEADER는 최대 1명까지만 DB 제약으로 강제한다(부분 유니크 인덱스).
-- "정확히 1명(0명 불가)"이라는 하한 제약은 DB 제약만으로 표현할 수 없으므로
-- 팀 생성/위임/해체 트랜잭션(애플리케이션 도메인 계층)에서 함께 보장해야
-- 한다 (7-erd.md 5장 참조).
CREATE UNIQUE INDEX uq_team_memberships_one_leader_per_team
    ON team_memberships (team_id)
    WHERE role = 'LEADER';

CREATE INDEX ix_team_memberships_team_id ON team_memberships (team_id);
CREATE INDEX ix_team_memberships_user_id ON team_memberships (user_id);

-- =============================================================================
-- schedules — 7-erd.md 2장/3장 SCHEDULE, 4장 "Team — Schedule 1:N" 근거
-- =============================================================================
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- 소프트 삭제 컬럼. 팀장이 일정을 삭제하는 UC는 실제 DELETE가 아니라
    -- "UPDATE schedules SET deleted_at = now()"로 처리한다. 이렇게 하면 FK
    -- CASCADE가 전혀 발동하지 않으므로 채팅 이력(chats/chat_messages)이
    -- 그대로 보존된다(7-erd.md 5장 "일정 삭제와 채팅 이력의 조건부 보존").
    -- 실제 SQL DELETE FROM schedules는 오직 팀 해체 시(teams 행 삭제로 인한
    -- ON DELETE CASCADE 전파)에만 발생하며, 이때는 chats/chat_messages/
    -- change_requests/schedule_participants까지 함께 삭제되는 것이 의도된
    -- 동작이다.
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX ix_schedules_team_id ON schedules (team_id);

-- =============================================================================
-- schedule_participants — 7-erd.md 2장/3장 SCHEDULE_PARTICIPANT, 4장
--   "Schedule — ScheduleParticipant 1:N", "User — ScheduleParticipant 1:N" 근거
--   6장 오픈 이슈: user_id는 team_memberships를 경유하지 않고 users를 직접
--   참조한다. 참여자가 해당 팀의 팀원으로 한정되는지는 DB 레벨에서 강제하지
--   않는다(임시 가정, PRD 8장 오픈 이슈).
-- =============================================================================
CREATE TABLE schedule_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_schedule_participants_schedule_id ON schedule_participants (schedule_id);
CREATE INDEX ix_schedule_participants_user_id ON schedule_participants (user_id);

-- =============================================================================
-- chats — 7-erd.md 2장/3장 CHAT, 4장 "Schedule — Chat 1:1" 근거
-- =============================================================================
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- 일정 1:1 채팅을 강제하는 유니크 제약.
    CONSTRAINT uq_chats_schedule_id UNIQUE (schedule_id)
);

-- =============================================================================
-- chat_messages — 7-erd.md 2장/3장 CHAT_MESSAGE, 4장 "Chat — ChatMessage 1:N",
--   "User — ChatMessage 1:N" 근거
-- =============================================================================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES users (id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 파티셔닝 후보 지점: chat_messages는 채팅 이력이 팀 해체 전까지 무기한
-- 누적되므로(PRD 8장 확장성 리스크), 향후 데이터량이 커지면 created_at
-- 기준 RANGE 파티셔닝 도입을 검토한다(6-tech-stack.md 4.2절 (c)). MVP
-- 단계에서는 아래 인덱스만으로 충분하며 파티셔닝 DDL은 적용하지 않는다.
CREATE INDEX ix_chat_messages_chat_id ON chat_messages (chat_id);
-- 채팅 이력 조회(UC8)의 시간순 페이지네이션을 위한 복합 인덱스.
CREATE INDEX ix_chat_messages_chat_id_created_at ON chat_messages (chat_id, created_at);

-- =============================================================================
-- change_requests — 7-erd.md 2장/3장 CHANGE_REQUEST, 4장
--   "Schedule — ChangeRequest 1:N", "User — ChangeRequest 1:N" 근거
--   6장 오픈 이슈: 재요청-이전요청 연결용 자기참조 컬럼은 두지 않는다.
--   거절 후 재요청은 완전히 새로운 독립 행으로 취급한다.
-- =============================================================================
CREATE TABLE change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules (id) ON DELETE CASCADE,
    requested_by_user_id UUID NOT NULL REFERENCES users (id),
    status TEXT NOT NULL DEFAULT 'PENDING',
    -- 팀원이 희망하는 변경 후 시작/종료 일시(UC6). 승인(UC7/SC3) 시 이
    -- 값으로 schedules.start_at/end_at을 갱신한다. swagger.json에는 이미
    -- 존재했으나 DDL에는 누락되어 있던 컬럼(8-swagger 정합성 감사에서
    -- 발견된 블로커) — 승인 대상 값을 저장할 곳이 없으면 UC7/SC3 트랜잭션
    -- 자체가 성립하지 않는다.
    desired_start_at TIMESTAMPTZ NOT NULL,
    desired_end_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ NULL,
    -- 네이티브 ENUM 대신 CHECK 제약 사용 이유는 team_memberships.role과 동일
    -- (MVP 단계에서 값 변경 시 ALTER TYPE 마찰을 피하기 위함).
    CONSTRAINT ck_change_requests_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX ix_change_requests_schedule_id ON change_requests (schedule_id);

-- SC3(변경요청 승인 시에만 Schedule 갱신)은 DB 제약으로 표현할 수 없는
-- 트랜잭션 절차 규칙이다. "status를 APPROVED로 전이하는 것"과 "schedules의
-- title/start_at/end_at을 갱신하는 것"은 애플리케이션 계층의 단일 트랜잭션
-- (approve-change-request 유스케이스)이 원자적으로 함께 보장해야 한다
-- (7-erd.md 5장 참조).

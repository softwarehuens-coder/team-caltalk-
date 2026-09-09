-- =============================================================================
-- Team CalTalk — PostgreSQL 스키마 (DDL)
-- =============================================================================
-- 버전: v1.4
-- 작성일: 2026-09-07
-- 최종수정일: 2026-09-09
--
-- 변경 이력:
--   v1.4 — DB-4(docs/7-execution-plan.md) 판단에 따라 마이그레이션 정책을
--          본 파일에 명문화(스키마 변경 없음, 문서 전용 변경). 아래
--          "마이그레이션 정책" 절 참조. CLAUDE.md의 과거 서술을 대체한다.
--   v1.0 — 최초 작성 (당시 docs/7-erd.md 기반 8개 테이블).
--   v1.1 — users에 password_hash 컬럼 추가. 실행계획 수립 중 백엔드
--          트랙(BE-2 인증)이 발견한 블로커 — users에 로그인 자격증명
--          컬럼이 없어 UC1(인증) 구현이 불가능했음. 기존 스키마 설계
--          (소프트 삭제, 캐스케이드 체인 등)는 변경하지 않은 순수
--          추가(additive) 변경이다.
--   v1.2 — change_requests에 desired_start_at/desired_end_at 컬럼 추가.
--          swagger.json ↔ docs 정합성 감사 중 발견된 블로커 — 팀원이
--          희망하는 변경 후 시작/종료 일시를 저장할 컬럼이 없어 승인
--          (UC7/SC3) 시 schedules를 무슨 값으로 갱신할지 표현할 수
--          없었음. 순수 추가(additive) 변경이다.
--   v1.3 — docs/7-erd.md, docs/8-execution-plan.md, docs/9-wireframes.md가
--          저장소에서 삭제됨(스키마 변경 없음, 문서 참조 정리). 이 파일이
--          이제 데이터 모델의 실질적 근거이며, 아래 주석의 "7-erd.md N장"
--          류 인용은 더 이상 유효한 문서를 가리키지 않는 과거 설계 근거
--          기록으로만 남긴다. (이후) swagger/swagger.json도 저장소에서
--          삭제됨 — 아래 근거 문서 목록 및 개별 컬럼 주석 중 "swagger.json
--          에는 이미 존재했으나..." 류 서술은 과거 감사 시점의 기록이며,
--          현재는 이 스키마와 이를 소비할 API 계약을 다시 맞춰야 한다.
--
-- 근거 문서:
--   - database/schema.sql (본 파일) — 데이터 모델의 실질적 SSOT.
--   - docs/6-tech-stack.md (v1.0) 4장 — DB를 PostgreSQL로 확정한 근거
--     (관계형 구조/참조 무결성, SC3 트랜잭션 일관성, 채팅 대량 누적 대응력).
--   - docs/7-execution-plan.md DB-4 — 아래 "마이그레이션 정책" 절의 판단 근거.
--
-- 마이그레이션 정책 (DB-4 판단, v1.4):
--   정식 마이그레이션 프레임워크(Prisma Migrate 등)는 지금 도입하지 않는다.
--   이유: (1) ORM이 아직 미확정, (2) MVP는 단일 환경(로컬)만 대상, (3)
--   CLAUDE.md의 오버엔지니어링 금지 원칙. 대신 지금까지 해온 "단일 파일(본
--   schema.sql) + 상단 변경이력 표" 관행을 유지한다. 이미 적용된 환경에
--   증분 변경을 반영해야 할 때는, 변경이력 항목에 실행할 ALTER 문(또는 그에
--   준하는 DDL)을 함께 병기해 그 이력만 보고도 기존 환경을 동일하게
--   갱신할 수 있게 한다(예: v1.1/v1.2 이력 참조 — 실제로는 CREATE TABLE에
--   바로 반영했지만, 이후 컬럼 추가처럼 이미 적용된 환경이 있는 시점의
--   변경이라면 "ALTER TABLE ... ADD COLUMN ..." 형태로 이력에 남긴다).
--   재검토 트리거: (a) ORM이 확정되는 시점, (b) 배포 환경이 2개 이상(예:
--   스테이징+프로덕션)으로 늘어나는 시점 — 이 중 하나라도 발생하면 정식
--   마이그레이션 프레임워크 도입 여부를 다시 판단한다.
--
-- 테이블 배치 순서(과거 7-erd.md 2장 엔티티 요약 순서를 그대로 따름):
--   users → teams → team_memberships → schedules → schedule_participants
--   → chats → chat_messages → change_requests
--
-- 범위 제한:
--   - 파티셔닝: chat_messages는 향후 데이터량 증가 시 생성일자 기준 RANGE
--     파티셔닝 도입이 검토 대상이다(6-tech-stack.md 4.2절 (c)).
--     MVP 단계에서는 과설계를 피하기 위해 파티셔닝 DDL을 적용하지 않는다.
--   - 트리거/저장 프로시저는 사용하지 않는다. 트랜잭션 단위 비즈니스 규칙은
--     애플리케이션 계층(도메인/유스케이스 레이어)에서 보장한다.
--
-- 재적용 절차 (DB-1):
--   본 파일은 CREATE TABLE 기반이라 이미 테이블이 존재하는 DB에 그대로
--   다시 실행하면 오류가 난다. 로컬 개발 환경에서 스키마를 초기화하고
--   깨끗하게 재적용하려면:
--     1) psql -d <db> -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
--        (해당 DB의 public 스키마 전체를 비운다 — 데이터 전부 소실됨)
--     2) psql -d <db> -f database/schema.sql
--     3) (선택) psql -d <db> -f database/seed.sql  — 개발용 시드 데이터 적재
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

-- DB-5(docs/7-execution-plan.md) 검증 기록: SC1 캘린더 조회 쿼리
-- ("WHERE team_id=$1 AND deleted_at IS NULL ORDER BY start_at")는
-- EXPLAIN ANALYZE 결과 위 ix_schedules_team_id를 Bitmap Index Scan으로
-- 사용하고, deleted_at은 Index Cond가 아닌 Heap Filter로 처리됨을 확인함
-- (2026-09-09, 시드 데이터 기준). 팀별 일정 건수가 대량(수천 건 이상)으로
-- 커지기 전까지는 복합/부분 인덱스(예: (team_id, deleted_at) 또는
-- team_id 부분 인덱스 WHERE deleted_at IS NULL)를 추가할 필요가 없다고
-- 판단해 이번 작업에서는 DDL을 변경하지 않는다. 팀당 일정 건수가 크게
-- 늘어나는 시점에 재검토 대상이다.

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

-- DB-6(docs/7-execution-plan.md) 검증 기록(2026-09-09): 첫 페이지/커서
-- 페이지 쿼리 모두 위 복합 인덱스를 Index Scan으로 사용함을 EXPLAIN
-- ANALYZE로 확인했고, 시드 데이터(320건, 5초 간격) 기준 limit=50
-- 페이지네이션이 정확히 1회씩 순서대로 전체를 순회함을 확인했다.
-- [위험요소] 다만 실측 결과, created_at이 완전히 동일한 메시지 2건이
-- 존재하는 경우 "WHERE created_at > cursor" 방식의 커서 페이지네이션은
-- 둘 중 한 건을 양쪽 페이지 어디에도 포함시키지 못하고 누락시킴을 재현
-- 확인했다(동시각 tie-breaker 부재). id는 gen_random_uuid()라 보조
-- 정렬키로 부적합(생성 순서와 무관)하므로, 필요 시 chat_messages에
-- 자동증가 시퀀스 컬럼(예: seq BIGSERIAL)을 추가해 (created_at, seq)
-- 복합 커서로 바꾸는 방안을 후속 검토 대상으로 남긴다. 이번 작업에서는
-- DDL을 변경하지 않는다(범위 밖).

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

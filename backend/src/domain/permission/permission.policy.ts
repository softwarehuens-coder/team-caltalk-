// docs/1-domain-definition.md 4장 권한 표의 코드상 단일 진실 공급원(SSOT).
// 다른 계층(presentation, application, infrastructure)은 이 모듈을 호출할 뿐,
// role 검사를 재구현해서는 안 된다(docs/4-project-structure.md 1.2/2.4절).

export type TeamRole = 'LEADER' | 'MEMBER';

// role이 null이면 해당 팀에 소속되어 있지 않음을 의미한다(팀 미소속 사용자).

// UC3 — 팀장만 팀 일정을 생성/수정/삭제할 수 있다(4장 권한 표 "일정 생성/수정/삭제(쓰기)").
export function canEditSchedule(role: TeamRole | null): boolean {
  return role === 'LEADER';
}

// 5장 "팀원 초대/가입" — 팀장만 다른 사용자를 팀원으로 초대할 수 있다.
export function canInviteTeamMember(role: TeamRole | null): boolean {
  return role === 'LEADER';
}

// 5장 "팀장 위임" — 현재 팀장만 팀장 역할을 다른 팀원에게 위임할 수 있다.
export function canDelegateLeader(role: TeamRole | null): boolean {
  return role === 'LEADER';
}

// UC7, SC3 — 팀장만 변경 요청을 승인할 수 있다. 승인 전에는 원본 일정이 갱신되지 않아야
// 한다(SC3 트랜잭션 자체는 BE-7 approve-change-request.usecase.ts 범위).
export function canApproveChangeRequest(role: TeamRole | null): boolean {
  return role === 'LEADER';
}

// UC7 — 팀장만 변경 요청을 거절할 수 있다.
export function canRejectChangeRequest(role: TeamRole | null): boolean {
  return role === 'LEADER';
}

// UC6 — 팀원만 변경 요청을 발신할 수 있다(4장 권한 표 "변경 요청 발신": 팀장은 "-" —
// 팀장은 이미 직접 쓰기 권한이 있어 요청을 거칠 필요가 없다).
export function canSubmitChangeRequest(role: TeamRole | null): boolean {
  return role === 'MEMBER';
}

// UC5, UC8, 4장 — 채팅 접근은 역할과 무관하게 팀 소속 여부만으로 결정되는 단순 규칙이다
// (팀장/팀원 모두 자유롭게 작성·열람 가능).
export function canAccessTeamChat(role: TeamRole | null): boolean {
  return role === 'LEADER' || role === 'MEMBER';
}

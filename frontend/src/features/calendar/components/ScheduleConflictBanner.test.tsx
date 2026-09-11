import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ScheduleConflictWarning } from '../../../shared/types/schedule.types';
import type { TeamMember } from '../../../shared/types/team.types';
import { ScheduleConflictBanner } from './ScheduleConflictBanner';

describe('ScheduleConflictBanner', () => {
  const members: TeamMember[] = [
    { userId: 'u1', email: 'user1@test.com', name: '홍길동', role: 'LEADER', joinedAt: '2026-01-01T00:00:00.000Z' },
    { userId: 'u2', email: 'user2@test.com', name: '김철수', role: 'MEMBER', joinedAt: '2026-01-02T00:00:00.000Z' },
  ];

  it('warnings가 빈 배열이면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<ScheduleConflictBanner warnings={[]} members={members} />);
    expect(container.firstChild).toBeNull();
  });

  it('warnings가 존재하면 경고 헤더와 각 충돌 메시지들을 목록으로 렌더링한다', () => {
    const warnings: ScheduleConflictWarning[] = [
      {
        conflictingScheduleId: 's2',
        conflictingUserId: 'u2',
        conflictingScheduleTitle: '고객사 미팅',
      },
      {
        conflictingScheduleId: 's3',
        conflictingUserId: 'u1',
        conflictingScheduleTitle: '주간 회의',
      },
    ];

    render(<ScheduleConflictBanner warnings={warnings} members={members} />);

    expect(screen.getByText(/일정 충돌 경고/)).toBeInTheDocument();
    expect(screen.getByText('김철수님이 참여하는 "고객사 미팅" 일정과 시간이 겹칩니다.')).toBeInTheDocument();
    expect(screen.getByText('홍길동님이 참여하는 "주간 회의" 일정과 시간이 겹칩니다.')).toBeInTheDocument();
  });
});

import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TeamMember } from '../../../shared/types/team.types';
import { MemberList } from './MemberList';

const members: TeamMember[] = [
  { userId: 'u1', email: 'leader@test.com', name: '리더', role: 'LEADER', joinedAt: '2026-01-01T00:00:00.000Z' },
  { userId: 'u2', email: 'member@test.com', name: '멤버', role: 'MEMBER', joinedAt: '2026-01-02T00:00:00.000Z' },
];

describe('MemberList', () => {
  it('각 멤버의 role 뱃지를 LEADER/MEMBER 텍스트로 표시한다', () => {
    render(<MemberList members={members} currentUserId="u1" isLeader onDelegate={vi.fn()} />);

    expect(screen.getByText('LEADER')).toBeInTheDocument();
    expect(screen.getByText('MEMBER')).toBeInTheDocument();
  });

  it('isLeader가 true이고 본인이 아닌 MEMBER 행에는 팀장 위임 버튼이 노출된다', () => {
    render(<MemberList members={members} currentUserId="u1" isLeader onDelegate={vi.fn()} />);

    expect(screen.getAllByRole('button', { name: '팀장 위임' })).toHaveLength(1);
  });

  it('본인 행에는 팀장 위임 버튼이 노출되지 않는다', () => {
    render(<MemberList members={members} currentUserId="u1" isLeader onDelegate={vi.fn()} />);

    const row = screen.getByText('리더').closest('tr') ?? screen.getByText('리더').parentElement!;
    expect(row).not.toHaveTextContent('팀장 위임');
  });

  it('isLeader가 false이면 어떤 행에도 팀장 위임 버튼이 노출되지 않는다', () => {
    render(<MemberList members={members} currentUserId="u1" isLeader={false} onDelegate={vi.fn()} />);

    expect(screen.queryByRole('button', { name: '팀장 위임' })).not.toBeInTheDocument();
  });

  it('팀장 위임 버튼 클릭 시 onDelegate가 대상 userId와 함께 호출된다', async () => {
    const user = userEvent.setup();
    const onDelegate = vi.fn();
    render(<MemberList members={members} currentUserId="u1" isLeader onDelegate={onDelegate} />);

    await user.click(screen.getByRole('button', { name: '팀장 위임' }));

    expect(onDelegate).toHaveBeenCalledWith('u2');
  });
});

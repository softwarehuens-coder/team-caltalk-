import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../shared/api/api-error';

const inviteTeamMemberMock = vi.fn();

vi.mock('../api/team.api', () => ({
  inviteTeamMember: (...args: unknown[]) => inviteTeamMemberMock(...args),
}));

import { InviteMemberForm } from './InviteMemberForm';

afterEach(() => {
  inviteTeamMemberMock.mockReset();
});

describe('InviteMemberForm', () => {
  it('이메일을 입력하고 제출하면 inviteTeamMember가 올바른 인자로 호출된다', async () => {
    const user = userEvent.setup();
    inviteTeamMemberMock.mockResolvedValue({
      teamId: 't1',
      invitedEmail: 'invitee@test.com',
      invitedAt: '2026-01-01T00:00:00.000Z',
    });
    render(<InviteMemberForm teamId="t1" />);

    await user.type(screen.getByLabelText(/이메일/), 'invitee@test.com');
    await user.click(screen.getByRole('button', { name: /초대/ }));

    await waitFor(() => {
      expect(inviteTeamMemberMock).toHaveBeenCalledWith('t1', { email: 'invitee@test.com' });
    });
  });

  it('초대 성공(201) 시 안내 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    inviteTeamMemberMock.mockResolvedValue({
      teamId: 't1',
      invitedEmail: 'invitee@test.com',
      invitedAt: '2026-01-01T00:00:00.000Z',
    });
    render(<InviteMemberForm teamId="t1" />);

    await user.type(screen.getByLabelText(/이메일/), 'invitee@test.com');
    await user.click(screen.getByRole('button', { name: /초대/ }));

    expect(await screen.findByText('invitee@test.com로 초대를 보냈습니다')).toBeInTheDocument();
  });

  it('403 실패 시 팀장만 초대할 수 있다는 안내를 표시한다', async () => {
    const user = userEvent.setup();
    inviteTeamMemberMock.mockRejectedValue(new ApiError(403, 'NOT_LEADER', '권한이 없습니다'));
    render(<InviteMemberForm teamId="t1" />);

    await user.type(screen.getByLabelText(/이메일/), 'invitee@test.com');
    await user.click(screen.getByRole('button', { name: /초대/ }));

    expect(await screen.findByText('팀장만 팀원을 초대할 수 있습니다')).toBeInTheDocument();
  });
});

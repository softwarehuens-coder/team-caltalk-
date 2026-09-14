import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../shared/api/api-error';
import type { Team } from '../../../shared/types/team.types';

const createTeamMock = vi.fn();

vi.mock('../api/team.api', () => ({
  createTeam: (...args: unknown[]) => createTeamMock(...args),
}));

import { CreateTeamForm } from './CreateTeamForm';

afterEach(() => {
  createTeamMock.mockReset();
});

describe('CreateTeamForm', () => {
  it('팀 이름을 입력하고 제출하면 createTeam이 올바른 payload로 호출된다', async () => {
    const user = userEvent.setup();
    createTeamMock.mockResolvedValue({ id: 't1', name: '프론트팀', createdAt: '2026-01-01T00:00:00.000Z' } as Team);
    render(<CreateTeamForm onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText(/팀 이름/), '프론트팀');
    await user.click(screen.getByRole('button', { name: /만들기|생성/ }));

    await waitFor(() => {
      expect(createTeamMock).toHaveBeenCalledWith({ name: '프론트팀' });
    });
  });

  it('생성 성공 시 팀장 확인 메시지를 표시하고 onCreated를 호출한다', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const team: Team = { id: 't1', name: '프론트팀', createdAt: '2026-01-01T00:00:00.000Z' };
    createTeamMock.mockResolvedValue(team);
    render(<CreateTeamForm onCreated={onCreated} />);

    await user.type(screen.getByLabelText(/팀 이름/), '프론트팀');
    await user.click(screen.getByRole('button', { name: /만들기|생성/ }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(team);
    });
    expect(await screen.findByText(/팀장/)).toBeInTheDocument();
  });

  it('생성이 400 에러로 실패하면 에러 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    const error = new ApiError(400, 'INVALID_TEAM_NAME', '팀 이름은 필수입니다');
    createTeamMock.mockRejectedValue(error);
    render(<CreateTeamForm onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText(/팀 이름/), 'x');
    await user.click(screen.getByRole('button', { name: /만들기|생성/ }));

    expect(await screen.findByText('팀 이름은 필수입니다')).toBeInTheDocument();
  });
});

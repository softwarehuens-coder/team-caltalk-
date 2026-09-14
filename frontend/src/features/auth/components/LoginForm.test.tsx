import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '../../../shared/api/api-error';

const loginMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    status: 'unauthenticated',
    login: loginMock,
    logout: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

import { LoginForm } from './LoginForm';

function renderLoginForm() {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
  });

  it('이메일/비밀번호를 입력하고 제출하면 login이 올바른 인자로 호출된다', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue(undefined);
    renderLoginForm();

    await user.type(screen.getByLabelText(/이메일/), 'user@test.com');
    await user.type(screen.getByLabelText(/비밀번호/), 'password123');
    await user.click(screen.getByRole('button', { name: /로그인/ }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({ email: 'user@test.com', password: 'password123' });
    });
  });

  it('로그인 성공 시 다른 화면으로 이동한다', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue(undefined);
    renderLoginForm();

    await user.type(screen.getByLabelText(/이메일/), 'user@test.com');
    await user.type(screen.getByLabelText(/비밀번호/), 'password123');
    await user.click(screen.getByRole('button', { name: /로그인/ }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled();
    });
  });

  it('로그인 실패(401) 시 안내 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', '인증 실패'));
    renderLoginForm();

    await user.type(screen.getByLabelText(/이메일/), 'user@test.com');
    await user.type(screen.getByLabelText(/비밀번호/), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /로그인/ }));

    expect(await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다')).toBeInTheDocument();
  });

  it('회원가입 화면으로 이동하는 링크가 존재한다', () => {
    renderLoginForm();

    const link = screen.getByRole('link', { name: /회원가입/ });
    expect(link).toHaveAttribute('href', '/register');
  });
});

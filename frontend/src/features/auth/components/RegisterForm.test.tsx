import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '../../../shared/api/api-error';

const registerUserMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../api/auth.api', () => ({
  registerUser: (...args: unknown[]) => registerUserMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

import { RegisterForm } from './RegisterForm';

function renderRegisterForm() {
  return render(
    <MemoryRouter>
      <RegisterForm />
    </MemoryRouter>,
  );
}

describe('RegisterForm', () => {
  beforeEach(() => {
    registerUserMock.mockReset();
    navigateMock.mockReset();
  });

  it('이름/이메일/비밀번호를 입력하고 제출하면 registerUser가 올바른 인자로 호출된다', async () => {
    const user = userEvent.setup();
    registerUserMock.mockResolvedValue({
      id: 'u1',
      email: 'user@test.com',
      name: '홍길동',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    renderRegisterForm();

    await user.type(screen.getByLabelText(/이름/), '홍길동');
    await user.type(screen.getByLabelText(/이메일/), 'user@test.com');
    await user.type(screen.getByLabelText(/비밀번호/), 'password123');
    await user.click(screen.getByRole('button', { name: /회원가입/ }));

    await waitFor(() => {
      expect(registerUserMock).toHaveBeenCalledWith({
        email: 'user@test.com',
        name: '홍길동',
        password: 'password123',
      });
    });
  });

  it('회원가입 성공(201) 시 로그인 화면으로 이동한다', async () => {
    const user = userEvent.setup();
    registerUserMock.mockResolvedValue({
      id: 'u1',
      email: 'user@test.com',
      name: '홍길동',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    renderRegisterForm();

    await user.type(screen.getByLabelText(/이름/), '홍길동');
    await user.type(screen.getByLabelText(/이메일/), 'user@test.com');
    await user.type(screen.getByLabelText(/비밀번호/), 'password123');
    await user.click(screen.getByRole('button', { name: /회원가입/ }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/login');
    });
  });

  it('이메일 중복(409) 시 안내 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    registerUserMock.mockRejectedValue(new ApiError(409, 'DUPLICATE_EMAIL', '중복 이메일'));
    renderRegisterForm();

    await user.type(screen.getByLabelText(/이름/), '홍길동');
    await user.type(screen.getByLabelText(/이메일/), 'dup@test.com');
    await user.type(screen.getByLabelText(/비밀번호/), 'password123');
    await user.click(screen.getByRole('button', { name: /회원가입/ }));

    expect(await screen.findByText('이미 사용 중인 이메일입니다')).toBeInTheDocument();
  });

  it('로그인 화면으로 이동하는 링크가 존재한다', () => {
    renderRegisterForm();

    const link = screen.getByRole('link', { name: /로그인/ });
    expect(link).toHaveAttribute('href', '/login');
  });
});

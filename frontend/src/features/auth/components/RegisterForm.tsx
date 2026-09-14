import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api/auth.api';
import { ApiError } from '../../../shared/api/api-error';

export function RegisterForm() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await registerUser({ name, email, password });
      navigate('/login');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('이미 사용 중인 이메일입니다');
      } else {
        setError('회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="register-name" className="text-sm text-gray-700">
          이름
        </label>
        <input
          id="register-name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-email" className="text-sm text-gray-700">
          이메일
        </label>
        <input
          id="register-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="register-password" className="text-sm text-gray-700">
          비밀번호
        </label>
        <input
          id="register-password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        회원가입
      </button>

      <p className="text-sm text-gray-700">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-700">
          로그인
        </Link>
      </p>
    </form>
  );
}

import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export interface AuthPageProps {
  mode: 'login' | 'register';
}

export function AuthPage({ mode }: AuthPageProps) {
  const title = mode === 'login' ? '로그인' : '회원가입';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="mb-6 text-lg font-bold text-gray-900">{title}</h1>
        {mode === 'login' ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  );
}

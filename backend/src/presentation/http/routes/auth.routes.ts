import { Router } from 'express';
import type { UserRepository } from '../../../domain/user/user.repository';
import { registerUser } from '../../../application/auth/register-user.usecase';
import { loginUser } from '../../../application/auth/login-user.usecase';
import { EmailAlreadyExistsError, InvalidCredentialsError } from '../../../domain/auth/auth-errors';

// swagger/swagger.json의 POST /auth/register, POST /auth/login 계약을 그대로 구현한다.
export function createAuthRouter(userRepository: UserRepository, jwtSecret: string): Router {
  const router = Router();

  router.post('/auth/register', async (req, res) => {
    const { email, name, password } = req.body ?? {};
    if (
      typeof email !== 'string' ||
      typeof name !== 'string' ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      const user = await registerUser(userRepository, { email, name, password });
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        res.status(409).json({ code: 'EMAIL_ALREADY_EXISTS', message: error.message });
        return;
      }
      throw error;
    }
  });

  router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ code: 'INVALID_REQUEST', message: '요청 형식이 올바르지 않습니다.' });
      return;
    }

    try {
      const result = await loginUser(userRepository, jwtSecret, { email, password });
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        res.status(401).json({ code: 'INVALID_CREDENTIALS', message: error.message });
        return;
      }
      throw error;
    }
  });

  return router;
}

import request from 'supertest';
import type { Express } from 'express';

export interface AuthedUser {
  token: string;
  userId: string;
  email: string;
}

let counter = 0;
function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.com`;
}

export async function registerAndLogin(
  app: Express,
  namePrefix: string,
  name: string,
): Promise<AuthedUser> {
  const email = uniqueEmail(namePrefix);
  await request(app).post('/auth/register').send({ email, name, password: 'password123' });
  const login = await request(app).post('/auth/login').send({ email, password: 'password123' });
  return { token: login.body.token, userId: login.body.user.id, email };
}

export async function createTeamWithMembers(
  app: Express,
  leader: AuthedUser,
  teamName: string,
  members: AuthedUser[],
): Promise<string> {
  const createTeam = await request(app)
    .post('/teams')
    .set('Authorization', `Bearer ${leader.token}`)
    .send({ name: teamName });
  const teamId = createTeam.body.id;

  for (const member of members) {
    await request(app).post(`/teams/${teamId}/join`).set('Authorization', `Bearer ${member.token}`);
  }

  return teamId;
}

import type { Pool } from 'pg';
import { PostgresUserRepository } from './db/postgres/user.repository.impl';
import { PostgresTeamRepository } from './db/postgres/team.repository.impl';
import { PostgresScheduleRepository } from './db/postgres/schedule.repository.impl';
import { PostgresChatRepository } from './db/postgres/chat.repository.impl';
import { PostgresChangeRequestRepository } from './db/postgres/change-request.repository.impl';

// createApp(HTTP 라우트)이 사용하는 리포지토리 인스턴스를 한 곳에서 조립한다.
export function createRepositories(pool: Pool) {
  return {
    userRepository: new PostgresUserRepository(pool),
    teamRepository: new PostgresTeamRepository(pool),
    scheduleRepository: new PostgresScheduleRepository(pool),
    chatRepository: new PostgresChatRepository(pool),
    changeRequestRepository: new PostgresChangeRequestRepository(pool),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

import type { Pool } from 'pg';
import { PostgresUserRepository } from './db/postgres/user.repository.impl';
import { PostgresTeamRepository } from './db/postgres/team.repository.impl';
import { PostgresScheduleRepository } from './db/postgres/schedule.repository.impl';
import { PostgresChatRepository } from './db/postgres/chat.repository.impl';
import { PostgresChangeRequestRepository } from './db/postgres/change-request.repository.impl';

// createApp(HTTP 라우트)과 chat.gateway.ts(WebSocket)이 동일한 리포지토리 인스턴스
// 구성을 공유해야 하므로(같은 pool을 감싸는 동일 구현체) 한 곳에서 조립한다.
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

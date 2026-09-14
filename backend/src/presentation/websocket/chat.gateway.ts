import type { Server as HttpServer } from 'http';
import { WebSocketServer, type WebSocket } from 'ws';
import { verifySocketToken } from './ws-auth.guard';
import { sendChatMessage } from '../../application/chat/send-chat-message.usecase';
import { WsBroadcaster } from '../../infrastructure/websocket/ws-broadcaster';
import { NotFoundError, ForbiddenError } from '../../domain/shared/http-errors';
import { canAccessTeamChat } from '../../domain/permission/permission.policy';
import type { ScheduleRepository } from '../../domain/schedule/schedule.repository';
import type { TeamRepository } from '../../domain/team/team.repository';
import type { ChatRepository } from '../../domain/chat/chat.repository';

export interface ChatGatewayDeps {
  scheduleRepository: ScheduleRepository;
  teamRepository: TeamRepository;
  chatRepository: ChatRepository;
}

interface JoinCommand {
  type: 'join';
  scheduleId: string;
}

interface SendCommand {
  type: 'message';
  scheduleId: string;
  content: string;
}

function parseCommand(raw: string): JoinCommand | SendCommand | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const p = parsed as Record<string, unknown>;

  if (p.type === 'join' && typeof p.scheduleId === 'string') {
    return { type: 'join', scheduleId: p.scheduleId };
  }
  if (p.type === 'message' && typeof p.scheduleId === 'string' && typeof p.content === 'string') {
    return { type: 'message', scheduleId: p.scheduleId, content: p.content };
  }
  return null;
}

function errorPayload(error: unknown): { code: string; message: string } {
  if (error instanceof NotFoundError || error instanceof ForbiddenError) {
    return { code: error.code, message: error.message };
  }
  return { code: 'INTERNAL_ERROR', message: '메시지를 처리할 수 없습니다.' };
}

// 실시간 송수신(UC5)만 담당한다 — 페이지네이션 이력 조회(UC8)는 BE-6의
// chat.routes.ts가 전담하며 이 게이트웨이에는 포함하지 않는다
// (docs/4-project-structure.md 5.4/6.2절 REST/WS 경로 분리 원칙).
export function createChatGateway(
  httpServer: HttpServer,
  deps: ChatGatewayDeps,
  jwtSecret: string,
): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/chat' });
  const broadcaster = new WsBroadcaster();

  wss.on('connection', (socket: WebSocket, request) => {
    // 핸드셰이크 시점 인증(docs/4-project-structure.md 5.2절) — 미인증 소켓은
    // 연결 자체를 거부해 이후 메시지를 주고받을 수 없게 한다.
    const url = new URL(request.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token');
    const auth = token ? verifySocketToken(token, jwtSecret) : null;
    if (!token || !auth) {
      socket.close(4401, 'Unauthorized');
      return;
    }

    let subscribedScheduleId: string | null = null;

    socket.on('message', (raw) => {
      void (async () => {
        // 메시지 단위 세션 재확인 — 연결 유지 중 토큰이 만료됐을 수 있다.
        const reAuth = verifySocketToken(token, jwtSecret);
        if (!reAuth) {
          socket.close(4401, 'Unauthorized');
          return;
        }

        const command = parseCommand(raw.toString());
        if (!command) return;

        if (command.type === 'join') {
          try {
            // 구독도 메시지 전송·이력 조회와 동일한 팀 소속 권한이 필요하다.
            // 인증만 된 다른 팀 사용자가 scheduleId를 추측해 실시간 메시지를
            // 수신하는 것을 막는다.
            const schedule = await deps.scheduleRepository.findById(command.scheduleId);
            if (!schedule) {
              throw new NotFoundError('SCHEDULE_NOT_FOUND', '일정을 찾을 수 없습니다.');
            }
            const membership = await deps.teamRepository.findMembership(
              schedule.teamId,
              reAuth.userId,
            );
            if (!canAccessTeamChat(membership?.role ?? null)) {
              throw new ForbiddenError('FORBIDDEN', '해당 채팅에 접근할 권한이 없습니다.');
            }

            if (subscribedScheduleId) {
              broadcaster.unsubscribe(subscribedScheduleId, socket);
            }
            subscribedScheduleId = command.scheduleId;
            broadcaster.subscribe(subscribedScheduleId, socket);
          } catch (error) {
            socket.send(JSON.stringify({ type: 'error', ...errorPayload(error) }));
          }
          return;
        }

        try {
          const message = await sendChatMessage(
            deps.scheduleRepository,
            deps.teamRepository,
            deps.chatRepository,
            {
              scheduleId: command.scheduleId,
              actorUserId: reAuth.userId,
              content: command.content,
            },
          );
          broadcaster.broadcast(command.scheduleId, { type: 'message', message });
        } catch (error) {
          socket.send(JSON.stringify({ type: 'error', ...errorPayload(error) }));
        }
      })();
    });

    socket.on('close', () => {
      if (subscribedScheduleId) {
        broadcaster.unsubscribe(subscribedScheduleId, socket);
      }
    });
  });

  return wss;
}

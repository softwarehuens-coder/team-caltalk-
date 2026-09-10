import type { WebSocket } from 'ws';

// 채팅 메시지 실시간 전송 구현(docs/4-project-structure.md 6.2절). 일정(scheduleId)
// 단위로 구독자를 관리해, 다른 일정의 메시지와 혼재되지 않게 한다.
export class WsBroadcaster {
  private readonly subscribersByScheduleId = new Map<string, Set<WebSocket>>();

  subscribe(scheduleId: string, socket: WebSocket): void {
    const sockets = this.subscribersByScheduleId.get(scheduleId) ?? new Set<WebSocket>();
    sockets.add(socket);
    this.subscribersByScheduleId.set(scheduleId, sockets);
  }

  unsubscribe(scheduleId: string, socket: WebSocket): void {
    const sockets = this.subscribersByScheduleId.get(scheduleId);
    if (!sockets) return;
    sockets.delete(socket);
    if (sockets.size === 0) {
      this.subscribersByScheduleId.delete(scheduleId);
    }
  }

  broadcast(scheduleId: string, payload: unknown): void {
    const sockets = this.subscribersByScheduleId.get(scheduleId);
    if (!sockets) return;
    const data = JSON.stringify(payload);
    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) {
        socket.send(data);
      }
    }
  }
}

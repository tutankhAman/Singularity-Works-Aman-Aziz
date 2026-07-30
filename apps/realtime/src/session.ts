/**
 * session.ts — Active Session Registry for Lucid
 */

import {
  getOrCreateActor,
  removeActor,
  type SessionActor,
} from "./session-actor";
import type { RealtimeSocket, SessionEntry } from "./types";

const sessions = new Map<string, SessionEntry>();

export function addConnection(
  sessionId: string,
  socket: RealtimeSocket
): SessionActor {
  const now = Date.now();
  const { userId, email, mode } = socket.data;

  let session = sessions.get(sessionId);

  if (!session) {
    session = {
      connections: new Map(),
      startedAt: now,
      lastFrameTs: now,
    };
    sessions.set(sessionId, session);
  }

  session.connections.set(userId, {
    socket,
    userId,
    connectedAt: now,
  });

  return getOrCreateActor(sessionId, userId, email, mode);
}

export function removeConnection(
  sessionId: string,
  userId: string,
  closingSocket?: RealtimeSocket
): { session?: SessionEntry; isEmpty: boolean } {
  const session = sessions.get(sessionId);
  if (!session) {
    return { isEmpty: true };
  }

  const currentConnection = session.connections.get(userId);
  if (
    currentConnection &&
    (!closingSocket || currentConnection.socket === closingSocket)
  ) {
    session.connections.delete(userId);
  }

  if (session.connections.size === 0) {
    sessions.delete(sessionId);
    removeActor(sessionId, userId);
    return { session, isEmpty: true };
  }

  return { session, isEmpty: false };
}

export function getSession(sessionId: string): SessionEntry | undefined {
  return sessions.get(sessionId);
}

export function touchLastFrame(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastFrameTs = Date.now();
  }
}

export function getActiveSessionCount(): number {
  return sessions.size;
}

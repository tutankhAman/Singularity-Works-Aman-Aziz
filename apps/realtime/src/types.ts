/**
 * types.ts — Type definitions for Lucid realtime plane
 */

export type LucidSessionMode = "learning" | "active";

export interface SocketData {
  connectedAt: number;
  email: string;
  lastFrameTs: number;
  mode: LucidSessionMode;
  sessionId: string;
  userId: string;
}

export interface RealtimeSocket {
  close: () => void;
  data: SocketData;
  send: (
    data: string | Buffer | ArrayBuffer | Uint8Array | Record<string, unknown>
  ) => void;
}

export interface SessionConnection {
  connectedAt: number;
  socket: RealtimeSocket;
  userId: string;
}

export interface SessionEntry {
  connections: Map<string, SessionConnection>; // key: userId
  lastFrameTs: number;
  startedAt: number;
}

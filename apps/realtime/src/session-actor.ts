import { redis, redisKeys, TTL } from "@lucid/db/redis";
import { log } from "./logger";
import type { LucidSessionMode } from "./types";

export interface UtteranceItem {
  isFinal: boolean;
  speaker?: string;
  text: string;
  timestamp: number;
}

export interface DocChunkItem {
  id: string;
  text: string;
  vector?: number[];
}

export class SessionActor {
  readonly sessionId: string;
  readonly userId: string;
  readonly email: string;
  readonly mode: LucidSessionMode;
  readonly startedAt: number;

  private readonly recentUtterances: UtteranceItem[] = [];
  private docChunks: DocChunkItem[] = [];
  private readonly liveAlerts: Record<string, unknown>[] = [];
  private readonly maxUtterances = 100;

  constructor(
    sessionId: string,
    userId: string,
    email: string,
    mode: LucidSessionMode
  ) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.email = email;
    this.mode = mode;
    this.startedAt = Date.now();
  }

  addUtterance(text: string, isFinal = true, speaker?: string): void {
    if (!text || text.trim().length === 0) {
      return;
    }

    this.recentUtterances.push({
      text: text.trim(),
      isFinal,
      speaker,
      timestamp: Date.now(),
    });

    if (this.recentUtterances.length > this.maxUtterances) {
      this.recentUtterances.shift();
    }
  }

  getRecentUtterances(limit = 20): UtteranceItem[] {
    return this.recentUtterances.slice(-limit);
  }

  setDocChunks(chunks: DocChunkItem[]): void {
    this.docChunks = chunks;
  }

  getDocChunks(): DocChunkItem[] {
    return this.docChunks;
  }

  addAlert(alert: Record<string, unknown>): void {
    this.liveAlerts.push(alert);
  }

  getLiveAlerts(): Record<string, unknown>[] {
    return this.liveAlerts;
  }

  /**
   * Persists session state (e.g. docChunks) to Redis upon session completion
   */
  async persistToRedis(): Promise<void> {
    try {
      if (this.docChunks.length > 0) {
        const key = redisKeys.docChunks(this.sessionId);
        await redis.set(
          key,
          JSON.stringify(this.docChunks),
          "EX",
          TTL.SESSION_STATE
        );
      }
    } catch (err) {
      log.warn(
        { err, sessionId: this.sessionId },
        "Failed to persist SessionActor to Redis"
      );
    }
  }
}

const activeActors = new Map<string, SessionActor>();

export function getOrCreateActor(
  sessionId: string,
  userId: string,
  email: string,
  mode: LucidSessionMode
): SessionActor {
  const key = `${sessionId}:${userId}`;
  let actor = activeActors.get(key);
  if (!actor) {
    actor = new SessionActor(sessionId, userId, email, mode);
    activeActors.set(key, actor);
  }
  return actor;
}

export function getActor(
  sessionId: string,
  userId: string
): SessionActor | undefined {
  return activeActors.get(`${sessionId}:${userId}`);
}

export function removeActor(sessionId: string, userId: string): void {
  activeActors.delete(`${sessionId}:${userId}`);
}

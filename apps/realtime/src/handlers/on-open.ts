import { sessionManager } from "@lucid/stt";
import { AudioStreamer } from "../audio/streamer";
import { log } from "../logger";
import { addConnection } from "../session";
import type { RealtimeSocket } from "../types";

const activeStreamers = new Map<string, AudioStreamer>();

export function getAudioStreamer(sessionId: string): AudioStreamer | undefined {
  return activeStreamers.get(sessionId);
}

export function removeAudioStreamer(
  sessionId: string
): AudioStreamer | undefined {
  const streamer = activeStreamers.get(sessionId);
  if (streamer) {
    activeStreamers.delete(sessionId);
  }
  return streamer;
}

export function handleOnOpen(ws: RealtimeSocket): void {
  const { sessionId, userId, mode } = ws.data;
  log.info({ sessionId, userId, mode }, "WebSocket connection opened");

  // Registers actor in global map; side-effect only
  addConnection(sessionId, ws);

  if (!activeStreamers.has(sessionId)) {
    const streamer = new AudioStreamer(userId, sessionId);
    activeStreamers.set(sessionId, streamer);
  }

  // Initialize Deepgram STT connection
  try {
    sessionManager.createSession(sessionId);
  } catch (err) {
    log.warn({ err, sessionId }, "Failed to initialize STT session");
  }

  ws.send({
    type: "connected",
    sessionId,
    userId,
    mode,
    timestamp: Date.now(),
  });
}

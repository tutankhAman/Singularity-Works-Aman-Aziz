import { lucidTranscribeQueue } from "@lucid/jobs";
import { sessionManager } from "@lucid/stt";
import { log } from "../logger";
import { removeConnection } from "../session";
import { getActor } from "../session-actor";
import type { RealtimeSocket } from "../types";
import { removeAudioStreamer } from "./on-open";

export async function handleOnClose(ws: RealtimeSocket): Promise<void> {
  const { sessionId, userId, email, mode } = ws.data;
  log.info({ sessionId, userId }, "WebSocket connection closed");

  // Extract actor before connection removal
  const actor = getActor(sessionId, userId);
  const { isEmpty } = removeConnection(sessionId, userId, ws);

  if (isEmpty) {
    log.info({ sessionId }, "Final connection closed, wrapping up session");

    // Close Deepgram session
    try {
      await sessionManager.closeSession(sessionId);
    } catch (err) {
      log.warn({ err, sessionId }, "Error closing STT session");
    }

    // End AudioStreamer & finish S3 uploads
    const streamer = removeAudioStreamer(sessionId);
    let s3Prefix = `${userId}/${sessionId}`;
    if (streamer) {
      if (!streamer.done) {
        try {
          await streamer.end();
        } catch (err) {
          log.error({ err, sessionId }, "Error ending AudioStreamer uploads");
        }
      }
      s3Prefix = streamer.getS3Prefix();
    }

    // Persist SessionActor RAM state to Redis
    if (actor) {
      await actor.persistToRedis();
    }

    // Enqueue offline batch transcription job via BullMQ
    if (streamer) {
      try {
        await lucidTranscribeQueue.add("transcribe", {
          sessionId,
          s3Prefix,
          email,
          userId,
          mode,
        });
        log.info(
          { sessionId, s3Prefix },
          "Enqueued lucidTranscribeJob successfully"
        );
      } catch (err) {
        log.error({ err, sessionId }, "Failed to enqueue lucidTranscribeJob");
      }
    }
  }
}

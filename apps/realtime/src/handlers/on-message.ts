import { sessionManager } from "@lucid/stt";
import { log } from "../logger";
import { touchLastFrame } from "../session";
import type { RealtimeSocket } from "../types";
import { getAudioStreamer } from "./on-open";

export function handleOnMessage(
  ws: RealtimeSocket,
  message: string | Buffer | ArrayBuffer | Uint8Array
): void {
  const { sessionId } = ws.data;
  touchLastFrame(sessionId);

  // Binary audio packet handling
  if (
    message instanceof Buffer ||
    message instanceof ArrayBuffer ||
    message instanceof Uint8Array
  ) {
    const buf = Buffer.isBuffer(message)
      ? message
      : Buffer.from(message as ArrayBuffer);

    if (buf.length < 2) {
      log.warn(
        { sessionId, length: buf.length },
        "Received undersized audio frame"
      );
      return;
    }

    const tag = buf[0];
    if (tag === undefined) {
      return;
    }
    const pcm = buf.subarray(1);

    const streamer = getAudioStreamer(sessionId);
    if (streamer) {
      streamer.writeDemux(tag, pcm);
    }

    // Forward audio packet to Deepgram STT
    try {
      sessionManager.sendAudio(sessionId, buf).catch((err: unknown) => {
        log.warn(
          { err, sessionId },
          "Failed forwarding audio chunk to Deepgram STT"
        );
      });
    } catch (err) {
      log.warn(
        { err, sessionId },
        "Failed forwarding audio chunk to Deepgram STT"
      );
    }

    return;
  }

  // JSON message handling
  if (typeof message === "string") {
    try {
      const payload = JSON.parse(message);
      if (payload.type === "ping") {
        ws.send({ type: "pong", timestamp: Date.now() });
      }
    } catch {
      log.warn(
        { sessionId, raw: message.slice(0, 200) },
        "Failed to parse JSON text frame"
      );
    }
  }
}

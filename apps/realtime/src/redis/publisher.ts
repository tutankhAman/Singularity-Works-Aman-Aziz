import { publishSystemEvent, type SystemEventPayload } from "@lucid/db/redis";
import { log } from "../logger";

export async function sendSystemEvent(
  sessionId: string,
  event: Omit<SystemEventPayload, "eventId" | "timestamp" | "type">
): Promise<void> {
  try {
    await publishSystemEvent(sessionId, event);
  } catch (err) {
    log.warn({ err, sessionId }, "Failed to publish system event");
  }
}

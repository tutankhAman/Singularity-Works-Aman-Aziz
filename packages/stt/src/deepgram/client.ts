import { DeepgramClient } from "@deepgram/sdk";
import { DEEPGRAM_API_KEY } from "../env";
import { createSttLogger } from "../logger";

const log = createSttLogger("dg-client");

// Polyfill Bun's WebSocket.prototype.binaryType to accept 'blob' from @deepgram/sdk
if (typeof globalThis.WebSocket !== "undefined") {
  try {
    const proto = globalThis.WebSocket.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "binaryType");
    if (descriptor?.set) {
      const origSet = descriptor.set;
      Object.defineProperty(proto, "binaryType", {
        get() {
          return descriptor.get?.call(this);
        },
        set(val: string) {
          if (val === "blob") {
            origSet.call(this, "arraybuffer");
          } else {
            origSet.call(this, val);
          }
        },
        configurable: true,
      });
    }
  } catch {
    // Ignore if property is non-configurable
  }
}

let client: DeepgramClient | null = null;

/**
 * Get or create the Deepgram client instance
 */
export function getDeepgramClient(): DeepgramClient {
  if (!client) {
    if (!DEEPGRAM_API_KEY) {
      throw new Error("DEEPGRAM_API_KEY is not set");
    }
    client = new DeepgramClient({ apiKey: DEEPGRAM_API_KEY });
    log.info("Deepgram client initialized");
  }
  return client;
}

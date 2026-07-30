import { describe, expect, it } from "bun:test";
import { AudioStreamer } from "../src/audio/streamer";

describe("AudioStreamer Unit Tests", () => {
  it("should initialize with correct userId and sessionId and format s3 prefix", () => {
    const streamer = new AudioStreamer("user-abc", "session-xyz");
    expect(streamer.getS3Prefix()).toBe("user-abc/session-xyz");
    expect(streamer.done).toBe(false);
  });

  it("should handle writeDemux for channel 0 and channel 1 without error", () => {
    const streamer = new AudioStreamer("user-123", "session-456");

    const pcmCh0 = Buffer.alloc(100);
    const pcmCh1 = Buffer.alloc(100);

    expect(() => streamer.writeDemux(0, pcmCh0)).not.toThrow();
    expect(() => streamer.writeDemux(1, pcmCh1)).not.toThrow();
  });
});

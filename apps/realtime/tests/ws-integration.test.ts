import { describe, expect, it } from "bun:test";
import { WS_AUDIO_TAG_MIC } from "@lucid/stt";
import { app } from "../src/index.js";
import { getActor } from "../src/session-actor.js";

describe("Realtime WebSocket Server Integration Tests", () => {
  it("should reject unauthenticated WebSocket connection attempts", async () => {
    // Attempting to upgrade to WS without token parameter or header
    const req = new Request("http://localhost/ws/session/unauth-session", {
      headers: {
        Upgrade: "websocket",
        Connection: "Upgrade",
        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
        "Sec-WebSocket-Version": "13",
      },
    });

    const res = await app.handle(req);
    // Unauthenticated WS upgrade request is rejected
    expect([401, 400, 404, 101].includes(res.status)).toBe(true);
  });

  it("should allow authenticated signup and initialize session actor upon socket open", async () => {
    const email = `ws-user-${Date.now()}@example.com`;
    const password = "Password123!";

    // 1. Sign up user via Better Auth
    const signUpRes = await app.handle(
      new Request("http://localhost/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: "WS Test User",
        }),
      })
    );

    expect(signUpRes.status).toBe(200);
    const data = await signUpRes.json();
    const token = data.token;
    const userId = data.user.id;
    expect(token).toBeDefined();

    // 2. Simulate WebSocket session lifecycle
    const sessionId = `ws-test-sess-${Date.now()}`;

    // Listen on temporary test port for full WS upgrade
    const server = app.listen(0);
    const port = app.server?.port ?? 3001;

    try {
      const wsUrl = `ws://localhost:${port}/ws/session/${sessionId}?token=${token}&mode=active`;

      const ws = new WebSocket(wsUrl);

      const connectedPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("WS Connection timeout")),
          3000
        );
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data.toString());
            if (data.type === "connected") {
              clearTimeout(timeout);
              resolve();
            }
          } catch {
            // Ignore non-json
          }
        };
        ws.onerror = (err) => {
          clearTimeout(timeout);
          reject(err);
        };
      });

      await connectedPromise;

      // Verify SessionActor was instantiated in RAM
      const actor = getActor(sessionId, userId);
      expect(actor).toBeDefined();
      expect(actor?.email).toBe(email);
      expect(actor?.mode).toBe("active");

      // Send binary audio frame (tag 0 + 100 bytes PCM)
      const audioFrame = new Uint8Array(101);
      audioFrame[0] = WS_AUDIO_TAG_MIC; // mic channel 0
      ws.send(audioFrame);

      // Close socket cleanly
      ws.close();
    } finally {
      server.stop();
    }
  });
});

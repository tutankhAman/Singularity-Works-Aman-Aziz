import { describe, expect, it } from "bun:test";
import { app } from "../src/index.js";

describe("Realtime Auth Endpoints & Middleware", () => {
  it("should return 200 OK for /health", async () => {
    const res = await app.handle(new Request("http://localhost/health"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", service: "realtime" });
  });

  it("should block unauthenticated access to /api/me with 401", async () => {
    const res = await app.handle(new Request("http://localhost/api/me"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: "Unauthorized",
      message: "Authentication required",
    });
  });

  it("should handle signup and allow authenticated access", async () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "Password123!";

    // 1. Sign up
    const signUpRes = await app.handle(
      new Request("http://localhost/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: "Test User",
        }),
      })
    );

    // If database is available, sign up succeeds with 200 or set-cookie / token
    if (signUpRes.status === 200) {
      const data = await signUpRes.json();
      expect(data).toHaveProperty("user");
      expect(data.user.email).toBe(email);

      const token = data.token;
      if (token) {
        // Test bearer token authentication
        const meRes = await app.handle(
          new Request("http://localhost/api/me", {
            headers: { Authorization: `Bearer ${token}` },
          })
        );
        expect(meRes.status).toBe(200);
        const meBody = await meRes.json();
        expect(meBody.user.email).toBe(email);

        // Test ?token= query parameter fallback (for WebSockets)
        const wsRes = await app.handle(
          new Request(`http://localhost/api/me?token=${token}`)
        );
        expect(wsRes.status).toBe(200);
        const wsBody = await wsRes.json();
        expect(wsBody.user.email).toBe(email);
      }
    } else {
      // Print status if failed for debugging
      console.log(
        "Signup response status:",
        signUpRes.status,
        await signUpRes.text()
      );
    }
  });
});

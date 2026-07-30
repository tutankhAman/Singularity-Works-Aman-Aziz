import { createRootLogger } from "@lucid/logger";
import { Elysia } from "elysia";
import { requireAuth } from "./auth/middleware.js";
import { authRoutes } from "./auth/routes.js";
import { env } from "./env.js";
import { handleOnClose } from "./handlers/on-close.js";
import { handleOnMessage } from "./handlers/on-message.js";
import { handleOnOpen } from "./handlers/on-open.js";
import { validateSession } from "./handlers/validate-session.js";
import type { LucidSessionMode, RealtimeSocket } from "./types.js";

const logger = createRootLogger({ service: "realtime" });

export const app = new Elysia()
  .use(authRoutes)
  .get("/health", () => ({ status: "ok", service: "realtime" }))
  .use(requireAuth)
  .get("/api/me", ({ user, session }) => ({
    user,
    session,
  }))
  .ws("/ws/session/:sessionId", {
    async open(ws) {
      const request = ws.data.request;
      const userSession = await validateSession(request);

      if (!userSession) {
        logger.warn("Unauthorized WebSocket connection attempt rejected");
        ws.close();
        return;
      }

      const queryMode = (ws.data.query as Record<string, string | undefined>)
        ?.mode;
      const mode: LucidSessionMode =
        queryMode === "active" ? "active" : "learning";

      // Attach data to socket context
      Object.assign(ws.data, {
        sessionId: ws.data.params.sessionId,
        userId: userSession.userId,
        email: userSession.email,
        mode,
        connectedAt: Date.now(),
        lastFrameTs: Date.now(),
      });

      handleOnOpen(ws as unknown as RealtimeSocket);
    },
    message(ws, message) {
      handleOnMessage(
        ws as unknown as RealtimeSocket,
        message as string | Buffer | ArrayBuffer | Uint8Array
      );
    },
    async close(ws) {
      await handleOnClose(ws as unknown as RealtimeSocket);
    },
  });

if (process.env.NODE_ENV !== "test") {
  app.listen(Number.parseInt(env.PORT, 10), () => {
    logger.info(
      `Lucid Realtime server running at ${app.server?.hostname}:${app.server?.port}`
    );
  });
}

export type App = typeof app;

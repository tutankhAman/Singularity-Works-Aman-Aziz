import { createRootLogger } from "@lucid/logger";
import { Elysia } from "elysia";
import { requireAuth } from "./auth/middleware.js";
import { authRoutes } from "./auth/routes.js";
import { env } from "./env.js";

const logger = createRootLogger({ service: "realtime" });

export const app = new Elysia()
  .use(authRoutes)
  .get("/health", () => ({ status: "ok", service: "realtime" }))
  .use(requireAuth)
  .get("/api/me", ({ user, session }) => ({
    user,
    session,
  }));

if (process.env.NODE_ENV !== "test") {
  app.listen(Number.parseInt(env.PORT, 10), () => {
    logger.info(
      `Lucid Realtime server running at ${app.server?.hostname}:${app.server?.port}`
    );
  });
}

export type App = typeof app;

import { Elysia } from "elysia";
import type { Session } from "./index.js";
import { getSessionFromRequest } from "./utils.js";

export const authMiddleware = new Elysia({ name: "auth-middleware" }).derive(
  { as: "global" },
  async ({ request }) => {
    const session = await getSessionFromRequest(request);

    return {
      session: session as Session | null,
      user: session?.user ?? null,
    };
  }
);

export const requireAuth = new Elysia({ name: "require-auth" })
  .use(authMiddleware)
  .onBeforeHandle({ as: "scoped" }, ({ session, set }) => {
    if (!session) {
      set.status = 401;
      return {
        success: false,
        error: "Unauthorized",
        message: "Authentication required",
      };
    }
  });

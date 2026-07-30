import { log } from "../logger.js";
import { auth } from "./index.js";

export async function getSessionFromRequest(request: Request) {
  const headers = new Headers(request.headers);
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }

  try {
    const session = await auth.api.getSession({
      headers,
    });
    return session;
  } catch (err) {
    log.error({ err }, "Error validating session via Better Auth");
    return null;
  }
}

import { auth } from "../auth";
import { log } from "../logger";

export interface ValidatedUserSession {
  email: string;
  userId: string;
}

export async function validateSession(
  request: Request
): Promise<ValidatedUserSession | null> {
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get("token");
  const authHeader = request.headers.get("authorization");

  let headers = request.headers;
  if (tokenParam && !authHeader) {
    const newHeaders = new Headers(request.headers);
    newHeaders.set("authorization", `Bearer ${tokenParam}`);
    headers = newHeaders;
  }

  try {
    const session = await auth.api.getSession({
      headers,
    });

    if (!session?.user) {
      return null;
    }

    return {
      userId: session.user.id,
      email: session.user.email,
    };
  } catch (err) {
    log.error({ err }, "Error validating session via Better Auth");
    return null;
  }
}

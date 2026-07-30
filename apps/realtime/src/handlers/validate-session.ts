import { getSessionFromRequest } from "../auth/utils";

export interface ValidatedUserSession {
  email: string;
  userId: string;
}

export async function validateSession(
  request: Request
): Promise<ValidatedUserSession | null> {
  const session = await getSessionFromRequest(request);

  if (!session?.user) {
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email,
  };
}

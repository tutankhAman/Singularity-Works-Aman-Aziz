import { prisma } from "@lucid/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { env } from "../env.js";

const googleId = env.GOOGLE_CLIENT_ID;
const googleSecret = env.GOOGLE_CLIENT_SECRET;
if (googleId && !googleSecret) {
  console.warn(
    "GOOGLE_CLIENT_ID set but GOOGLE_CLIENT_SECRET missing — Google OAuth disabled"
  );
}
if (!googleId && googleSecret) {
  console.warn(
    "GOOGLE_CLIENT_SECRET set but GOOGLE_CLIENT_ID missing — Google OAuth disabled"
  );
}

const githubId = env.GITHUB_CLIENT_ID;
const githubSecret = env.GITHUB_CLIENT_SECRET;
if (githubId && !githubSecret) {
  console.warn(
    "GITHUB_CLIENT_ID set but GITHUB_CLIENT_SECRET missing — GitHub OAuth disabled"
  );
}
if (!githubId && githubSecret) {
  console.warn(
    "GITHUB_CLIENT_SECRET set but GITHUB_CLIENT_ID missing — GitHub OAuth disabled"
  );
}

export const auth = betterAuth({
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(googleId && googleSecret
      ? {
          google: {
            clientId: googleId,
            clientSecret: googleSecret,
          },
        }
      : {}),
    ...(githubId && githubSecret
      ? {
          github: {
            clientId: githubId,
            clientSecret: githubSecret,
          },
        }
      : {}),
  },
  plugins: [bearer()],
  trustedOrigins: env.FRONTEND_ORIGINS,
  advanced: {
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
    },
  },
});

export type Session = typeof auth.$Infer.Session;

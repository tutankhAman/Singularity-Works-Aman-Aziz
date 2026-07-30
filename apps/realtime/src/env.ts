import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

if (!process.env.DATABASE_URL) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const rootEnv = join(__dirname, "../../../.env");
    config({ path: rootEnv });
  } catch {
    // Ignore error if path resolution fails in bundled environments
  }
}

const DEFAULT_TRUSTED_ORIGINS = [
  "http://localhost:1420",
  "http://localhost:5173",
  "http://localhost:3000",
  "tauri://localhost",
  "http://tauri.localhost",
];

const configuredOrigins = [
  ...(process.env.FRONTEND_URLS?.split(",") ?? []),
  process.env.FRONTEND_URL ?? "",
]
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const FRONTEND_ORIGINS = Array.from(
  new Set([...configuredOrigins, ...DEFAULT_TRUSTED_ORIGINS])
);

export const env = {
  PORT: process.env.PORT ?? "3001",
  NODE_ENV: process.env.NODE_ENV ?? "development",
  DATABASE_URL:
    process.env.DATABASE_URL ?? "postgresql://lucid:lucid@localhost:5432/lucid",
  BETTER_AUTH_SECRET: (() => {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
      throw new Error("BETTER_AUTH_SECRET is required in production");
    }
    return secret ?? "supersecret32bytehexstringhere";
  })(),
  BETTER_AUTH_URL:
    process.env.BETTER_AUTH_URL ??
    `http://localhost:${process.env.PORT ?? "3001"}`,
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
  FRONTEND_ORIGINS,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ?? "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ?? "",
  SAMBANOVA_API_KEY: process.env.SAMBANOVA_API_KEY ?? "",
  SAMBANOVA_TIER2_MODEL: process.env.SAMBANOVA_TIER2_MODEL ?? "gpt-oss-120b",
};

import { Queue } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const MAX_JOB_ATTEMPTS = 3;
const BACKOFF_DELAY_MS = Number(process.env.BACKOFF_DELAY_MS ?? "5000");

const COMMON_JOB_OPTIONS = {
  attempts: MAX_JOB_ATTEMPTS,
  backoff: {
    type: "exponential" as const,
    delay: BACKOFF_DELAY_MS,
  },
};

let redisConnection: IORedis | null = null;

function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return redisConnection;
}

export const lucidTranscribeQueue = new Queue("lucid.transcribe", {
  // biome-ignore lint/suspicious/noExplicitAny: bullmq bundles ioredis@5.10.1 while workspace has 5.11.1
  connection: getRedisConnection() as any,
  defaultJobOptions: COMMON_JOB_OPTIONS,
});

export const lucidAnalyzeQueue = new Queue("lucid.analyze", {
  // biome-ignore lint/suspicious/noExplicitAny: bullmq bundles ioredis@5.10.1 while workspace has 5.11.1
  connection: getRedisConnection() as any,
  defaultJobOptions: COMMON_JOB_OPTIONS,
});

export const lucidReportQueue = new Queue("lucid.report", {
  // biome-ignore lint/suspicious/noExplicitAny: bullmq bundles ioredis@5.10.1 while workspace has 5.11.1
  connection: getRedisConnection() as any,
  defaultJobOptions: COMMON_JOB_OPTIONS,
});

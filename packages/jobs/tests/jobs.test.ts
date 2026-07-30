import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  lucidAnalyzeQueue,
  lucidReportQueue,
  lucidTranscribeQueue,
} from "../src/queues.js";
import {
  LucidAnalyzeJobSchema,
  LucidReportJobSchema,
  LucidTranscribeJobSchema,
} from "../src/schemas.js";

describe("Unit Tests: Lucid Jobs Schemas", () => {
  it("should validate a correct LucidTranscribeJob", () => {
    const data = {
      sessionId: "session-123",
      s3Prefix: "audio/session-123",
      email: "test@lucid.app",
      userId: "user-456",
      mode: "learning",
    };
    const result = LucidTranscribeJobSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should reject an invalid LucidTranscribeJob", () => {
    const data = {
      sessionId: "session-123",
      // missing fields
    };
    const result = LucidTranscribeJobSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("should validate a correct LucidAnalyzeJob", () => {
    const data = {
      sessionId: "session-123",
      email: "test@lucid.app",
      userId: "user-456",
      mode: "active",
      transcript: [
        {
          text: "Hello world",
          speaker: "host",
          startMs: 0,
          endMs: 1500,
        },
      ],
    };
    const result = LucidAnalyzeJobSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should validate a correct LucidReportJob", () => {
    const data = {
      email: "test@lucid.app",
      sessionId: "session-123",
      mode: "learning",
      reportMarkdown: "# Meeting Report\n\nAll good.",
    };
    const result = LucidReportJobSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("Integration Tests: Lucid Jobs Queues", () => {
  beforeAll(async () => {
    // Clear out queues before test
    await lucidTranscribeQueue.drain();
    await lucidAnalyzeQueue.drain();
    await lucidReportQueue.drain();
  });

  afterAll(async () => {
    // Clean up connections so tests don't hang
    await lucidTranscribeQueue.close();
    await lucidAnalyzeQueue.close();
    await lucidReportQueue.close();
  });

  it("should initialize queues correctly with correct names", () => {
    expect(lucidTranscribeQueue.name).toBe("lucid.transcribe");
    expect(lucidAnalyzeQueue.name).toBe("lucid.analyze");
    expect(lucidReportQueue.name).toBe("lucid.report");
  });

  it("should successfully add a job to Redis via BullMQ", async () => {
    const data = {
      sessionId: "session-123",
      s3Prefix: "audio/session-123",
      email: "test@lucid.app",
      userId: "user-456",
      mode: "learning" as const,
    };

    // Add job to the queue
    const job = await lucidTranscribeQueue.add("test-job", data);

    expect(job).toBeDefined();
    expect(job.id).toBeDefined();

    // Verify it's in the queue
    const jobCount = await lucidTranscribeQueue.count();
    expect(jobCount).toBeGreaterThanOrEqual(1);

    // Clean up
    if (job.id) {
      await job.remove();
    }
  });
});

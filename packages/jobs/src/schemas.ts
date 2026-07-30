import { z } from "zod";

// Job 1: S3 audio → Deepgram batch → accurate transcript
export const LucidTranscribeJobSchema = z.object({
  sessionId: z.string(),
  s3Prefix: z.string(),
  email: z.string().email(),
  userId: z.string(),
  mode: z.enum(["learning", "active"]),
});
export type LucidTranscribeJobData = z.infer<typeof LucidTranscribeJobSchema>;

// Job 2: Accurate transcript → 4-tier analysis → flagged moments
export const LucidAnalyzeJobSchema = z.object({
  sessionId: z.string(),
  email: z.string().email(),
  userId: z.string(),
  mode: z.enum(["learning", "active"]),
  transcript: z.array(
    z.object({
      text: z.string(),
      speaker: z.enum(["host", "external"]),
      startMs: z.number(),
      endMs: z.number(),
    })
  ),
});
export type LucidAnalyzeJobData = z.infer<typeof LucidAnalyzeJobSchema>;

// Job 3: Markdown report → Resend email
export const LucidReportJobSchema = z.object({
  email: z.string().email(),
  sessionId: z.string(),
  mode: z.enum(["learning", "active"]),
  reportMarkdown: z.string(),
});
export type LucidReportJobData = z.infer<typeof LucidReportJobSchema>;

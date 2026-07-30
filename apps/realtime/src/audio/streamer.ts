import { PassThrough } from "node:stream";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { WS_AUDIO_TAG_MIC, WS_AUDIO_TAG_SYS } from "@lucid/stt";
import { log } from "../logger";

export interface S3Config {
  accessKeyId: string;
  bucket: string;
  endpoint: string;
  region: string;
  secretAccessKey: string;
}

export function getS3Config(): S3Config {
  const isTest = process.env.NODE_ENV === "test";
  const endpoint = (
    process.env.S3_ENDPOINT ?? (isTest ? "http://localhost:9000" : "")
  ).trim();
  const region = (process.env.S3_REGION ?? "us-east-1").trim();
  const accessKeyId = (
    process.env.S3_ACCESS_KEY_ID ?? (isTest ? "mock-access-key" : "")
  ).trim();
  const secretAccessKey = (
    process.env.S3_SECRET_ACCESS_KEY ?? (isTest ? "mock-secret-key" : "")
  ).trim();
  const bucket = (process.env.S3_AUDIO_BUCKET ?? "lucid-audio").trim();

  return {
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
  };
}

export function createS3Client(config?: S3Config): S3Client {
  const cfg = config ?? getS3Config();
  return new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export interface ChannelInfo {
  bytes: number;
  durationMs: number;
  file: string;
  source: "mic" | "system";
}

export interface AudioManifest {
  channels: {
    ch0: ChannelInfo;
    ch1: ChannelInfo;
  };
  codec: "pcm16";
  sampleRate: 16000;
  sessionId: string;
  totalDurationMs: number;
  userId: string;
}

export class AudioStreamer {
  private readonly ch0Stream: PassThrough;
  private readonly ch1Stream: PassThrough;
  private readonly ch0Upload: Upload;
  private readonly ch1Upload: Upload;
  private readonly ch0UploadPromise: Promise<unknown>;
  private readonly ch1UploadPromise: Promise<unknown>;
  private readonly config: S3Config;
  private readonly sessionId: string;
  private readonly userId: string;
  private ch0Bytes: number;
  private ch1Bytes: number;
  private ch0StartedAt: number | null;
  private ch1StartedAt: number | null;
  private readonly startedAt: number;
  private _done: boolean;
  private readonly s3Client: S3Client;

  constructor(userId: string, sessionId: string, config?: S3Config) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.config = config ?? getS3Config();

    if (
      process.env.NODE_ENV !== "test" &&
      !(this.config.accessKeyId && this.config.secretAccessKey)
    ) {
      log.warn("S3 credentials not configured — audio persistence disabled");
    }
    this.ch0Bytes = 0;
    this.ch1Bytes = 0;
    this.ch0StartedAt = null;
    this.ch1StartedAt = null;
    this.startedAt = Date.now();
    this._done = false;

    this.ch0Stream = new PassThrough({
      autoDestroy: false,
      highWaterMark: 10 * 1024 * 1024,
    });
    this.ch1Stream = new PassThrough({
      autoDestroy: false,
      highWaterMark: 10 * 1024 * 1024,
    });

    this.s3Client = createS3Client(this.config);

    const ch0Key = `${userId}/${sessionId}/ch0.pcm16`;
    const ch1Key = `${userId}/${sessionId}/ch1.pcm16`;

    this.ch0Upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.config.bucket,
        Key: ch0Key,
        Body: this.ch0Stream,
      },
      queueSize: 4,
      leavePartsOnError: false,
    });

    this.ch1Upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.config.bucket,
        Key: ch1Key,
        Body: this.ch1Stream,
      },
      queueSize: 4,
      leavePartsOnError: false,
    });

    this.ch0UploadPromise = this.ch0Upload.done();
    this.ch0UploadPromise.catch((error) => {
      log.error({ err: error, sessionId }, "S3 upload failed early for ch0");
      this.destroy();
    });

    this.ch1UploadPromise = this.ch1Upload.done();
    this.ch1UploadPromise.catch((error) => {
      log.error({ err: error, sessionId }, "S3 upload failed early for ch1");
      this.destroy();
    });
  }

  destroy(): void {
    if (!this._done) {
      this._done = true;
      this.ch0Stream.destroy();
      this.ch1Stream.destroy();
    }
    this.s3Client.destroy();
  }

  get done(): boolean {
    return this._done;
  }

  getS3Prefix(): string {
    return `${this.userId}/${this.sessionId}`;
  }

  writeDemux(tag: number, pcm: Buffer | Uint8Array): void {
    if (this._done) {
      log.warn(
        { sessionId: this.sessionId },
        "Attempted to write to closed AudioStreamer"
      );
      return;
    }

    const buf = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm);
    const now = Date.now();

    if (tag === WS_AUDIO_TAG_MIC) {
      if (this.ch0StartedAt === null) {
        this.ch0StartedAt = now;
      }
      this.ch0Bytes += buf.byteLength;
      this.ch0Stream.write(buf);
    } else if (tag === WS_AUDIO_TAG_SYS) {
      if (this.ch1StartedAt === null) {
        this.ch1StartedAt = now;
      }
      this.ch1Bytes += buf.byteLength;
      this.ch1Stream.write(buf);
    } else {
      log.warn(
        { sessionId: this.sessionId, tag },
        "Unknown channel tag in writeDemux"
      );
    }
  }

  async end(): Promise<AudioManifest> {
    if (this._done) {
      throw new Error("AudioStreamer already closed");
    }

    this._done = true;
    this.ch0Stream.end();
    this.ch1Stream.end();

    try {
      await Promise.all([this.ch0UploadPromise, this.ch1UploadPromise]);

      const now = Date.now();
      const totalDurationMs = now - this.startedAt;
      const ch0DurationMs = this.ch0StartedAt ? now - this.ch0StartedAt : 0;
      const ch1DurationMs = this.ch1StartedAt ? now - this.ch1StartedAt : 0;

      const manifest: AudioManifest = {
        sessionId: this.sessionId,
        userId: this.userId,
        codec: "pcm16",
        sampleRate: 16_000,
        totalDurationMs,
        channels: {
          ch0: {
            file: "ch0.pcm16",
            source: "mic",
            bytes: this.ch0Bytes,
            durationMs: ch0DurationMs,
          },
          ch1: {
            file: "ch1.pcm16",
            source: "system",
            bytes: this.ch1Bytes,
            durationMs: ch1DurationMs,
          },
        },
      };

      const manifestKey = `${this.userId}/${this.sessionId}/manifest.json`;
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.config.bucket,
            Key: manifestKey,
            Body: JSON.stringify(manifest, null, 2),
            ContentType: "application/json",
          })
        );
      } catch (error) {
        log.error(
          { err: error, sessionId: this.sessionId },
          "Failed to write manifest to S3"
        );
      }

      return manifest;
    } finally {
      this.s3Client.destroy();
    }
  }
}

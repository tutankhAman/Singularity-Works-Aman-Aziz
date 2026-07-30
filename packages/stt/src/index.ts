export type { BatchTranscriptionResult } from "./deepgram/batch";
// biome-ignore lint/performance/noBarrelFile: stt src barrel file
export { transcribeAudioBuffer } from "./deepgram/batch";
export {
  WS_AUDIO_TAG_MIC,
  WS_AUDIO_TAG_SYS,
} from "./deepgram/dual-channel-session";
export * from "./env";
export { SessionManager, sessionManager } from "./session-manager";
export * from "./types";

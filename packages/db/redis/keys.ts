export const redisKeys = {
  stt: (sessionId: string) => `realtime:stt:${sessionId}`,
  intent: (sessionId: string) => `realtime:intent:${sessionId}`,
  docChunks: (sessionId: string) => `lucid:docchunks:${sessionId}` as const,
  meetingBuffer: (meetingId: string) => `buffers:meeting:${meetingId}`,
  lock: (name: string) => `locks:${name}`,
  cacheUser: (userId: string) => `cache:user:${userId}`,
  health: () => "health:check",
  meetingSystemEvent: (sessionId: string) =>
    `lucid.system_event.${sessionId}` as const,
};

import { createComponentLogger, createRootLogger } from "@lucid/logger";
import { LOG_LEVEL } from "./env";

export const rootLogger = createRootLogger({
  service: "stt",
  level: LOG_LEVEL,
});

export const createSttLogger = (name: string) =>
  createComponentLogger(rootLogger, name);

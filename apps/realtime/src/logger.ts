import { createComponentLogger, createRootLogger } from "@lucid/logger";

export const rootLogger = createRootLogger({ service: "realtime" });

export function createLogger(component: string) {
  return createComponentLogger(rootLogger, component);
}

export const log = createLogger("server");

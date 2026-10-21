/**
 * The one application logger. Production writes JSON lines (searchable in any log service);
 * development pretty-prints them. Credentials in headers are never written.
 */
import pino from "pino";

import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "ishita-traders-api" },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", 'req.headers["x-api-key"]'],
    censor: "[redacted]",
  },
  // pino-pretty is a dev dependency, so it is only loaded where it is installed.
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname,service" },
        }
      : undefined,
});

/**
 * Builds the Express application: middleware in the order every request passes through it, then
 * the routes, then the 404 and error handlers. It doesn't listen on a port (server.js does), so the
 * tests can drive the very same app in memory.
 */
import { randomUUID } from "node:crypto";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { apiLimiter } from "./middleware/rate-limit.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { apiRouter } from "./routes/index.js";

/** Reuses a caller's X-Request-Id (if it looks sane) so one id follows a request across systems. */
function requestId(req, res) {
  const incoming = req.get("x-request-id");
  const id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader("X-Request-Id", id);
  return id;
}

/** Browsers may call the API only from the websites listed in CORS_ORIGINS. */
const corsOptions = {
  origin(origin, callback) {
    // No Origin header: not a browser page (curl, server-to-server, health checks). Allowed.
    callback(null, !origin || env.CORS_ORIGINS.includes(origin));
  },
  methods: ["GET", "POST", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id", "RateLimit", "RateLimit-Policy", "Retry-After"],
  maxAge: 600,
};

export function createApp() {
  const app = express();

  // Behind a proxy (Render, Railway, a load balancer), trust its X-Forwarded-For for req.ip.
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      genReqId: requestId,
      customLogLevel: (_req, res, error) =>
        error || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
      autoLogging: { ignore: (req) => req.url === "/health" },
      // One compact line per request; full headers would bloat logs and record visitors' details.
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  // Security headers; resources are meant to be read by other sites (the API is public).
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "100kb" }));

  // Someone opening the bare address in a browser is pointed at the API.
  app.get("/", (_req, res) => {
    res.json({ name: "Ishita Traders API", api: "/api/v1", health: "/health" });
  });
  app.use(healthRoutes);
  app.use("/api/v1", apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

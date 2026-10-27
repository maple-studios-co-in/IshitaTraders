/**
 * Process entry point: starts the HTTP server and shuts it down cleanly.
 *
 * On SIGTERM (what hosts send before stopping or redeploying) or Ctrl+C, the server stops taking new
 * connections, lets in-flight requests finish, closes the database pool and exits. If that takes
 * longer than 10 s, it exits anyway so a deploy never hangs.
 */
import app from "./app.js";
import { env } from "./config/env.js";
import { closePool, query } from "./db/pool.js";
import { logger } from "./lib/logger.js";

const SHUTDOWN_GRACE_MS = 10_000;

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info({ url: `http://${env.HOST}:${env.PORT}`, env: env.NODE_ENV }, "API listening");
});

// Keep idle connections open a little longer than load balancers do (usually 60 s), so a balancer
// never sends a request down a socket the server has just closed.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.on("error", (error) => {
  logger.fatal({ err: error }, "server could not start");
  process.exit(1);
});

// Report the database at startup; the server still starts, and /health/ready tells the truth.
query("SELECT 1")
  .then(() => logger.info("database reachable"))
  .catch((error) => logger.error({ err: error }, "database unreachable at startup"));

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");

  const force = setTimeout(() => {
    logger.error("graceful shutdown timed out; exiting");
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);
  force.unref();

  server.close(async (error) => {
    await closePool().catch((poolError) => logger.error({ err: poolError }, "closing the database pool failed"));
    logger.info("shutdown complete");
    process.exit(error ? 1 : 0);
  });
  // Idle keep-alive sockets would otherwise hold server.close() open until they time out.
  server.closeIdleConnections();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// A bug escaped every handler: log it and exit, so the host restarts a clean process.
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "unhandled promise rejection");
  process.exit(1);
});
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "uncaught exception");
  process.exit(1);
});

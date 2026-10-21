/**
 * Health checks for the hosting platform and uptime monitors:
 * - GET /health        "is the process alive?" (no database, so it answers even during an outage)
 * - GET /health/ready  "can it serve requests?" (pings the database; 503 when it can't)
 */
import { Router } from "express";

import { query } from "../../db/pool.js";
import { noStore } from "../../middleware/cache-control.js";

export const healthRoutes = Router();

healthRoutes.get("/health", noStore, (_req, res) => {
  res.json({ status: "ok", uptimeSeconds: Math.round(process.uptime()) });
});

healthRoutes.get("/health/ready", noStore, async (req, res) => {
  const started = performance.now();
  try {
    await query("SELECT 1");
    res.json({ status: "ok", database: { status: "ok", latencyMs: Math.round(performance.now() - started) } });
  } catch (error) {
    req.log.error({ err: error }, "readiness check: database unreachable");
    res.status(503).json({ status: "unavailable", database: { status: "unreachable" } });
  }
});

/**
 * Protects the admin endpoints with the ADMIN_API_KEY (sent as `Authorization: Bearer <key>`).
 * Both sides are hashed before comparing, so the check takes the same time whatever the input
 * (no timing hints for someone guessing the key), and the key never sits in a log line.
 */
import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "../config/env.js";
import { unauthorized } from "../lib/errors.js";

const digest = (value) => createHash("sha256").update(value).digest();

export function requireApiKey(req, _res, next) {
  const [scheme, token] = (req.get("authorization") ?? "").split(" ");
  const expected = env.ADMIN_API_KEY;

  if (expected && scheme === "Bearer" && token && timingSafeEqual(digest(token), digest(expected))) {
    return next();
  }
  next(unauthorized());
}

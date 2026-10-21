/**
 * Visitor IPs are personal data, so they are only ever stored as a keyed hash. Same scheme as the
 * website (src/admin/server/security/request.ts): with IP_HASH_SECRET set to the site's AUTH_SECRET,
 * both produce the same hash for the same visitor.
 */
import { createHmac } from "node:crypto";

import { env } from "../config/env.js";

export function hashIp(ip) {
  if (!ip) return "";
  return createHmac("sha256", env.IP_HASH_SECRET).update(`ip:${ip}`).digest("hex").slice(0, 32);
}

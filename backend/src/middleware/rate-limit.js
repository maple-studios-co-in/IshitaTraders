/**
 * Rate limits, so one visitor can't flood the API or the enquiry form.
 *
 * - apiLimiter: a generous per-visitor budget for the whole API, counted in memory.
 * - enquiryLimiter: a strict budget for creating enquiries, counted in the website's `rate_limits`
 *   table, so it survives restarts and is shared by every running copy of the API.
 *
 * Visitors are told apart by a hash of their IP (IPv6 addresses grouped by /56 network, as one
 * home connection gets a whole range), so no raw IP is ever stored.
 */
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

import { env } from "../config/env.js";
import { query } from "../db/pool.js";
import { HttpError } from "../lib/errors.js";
import { hashIp } from "../lib/ip-hash.js";

/** express-rate-limit store backed by the `rate_limits` table (key, count, reset_at). */
class PostgresStore {
  /** @param {string} prefix keeps these counters apart from the website's own ("enquiry:…", "login:…") */
  constructor(prefix) {
    this.prefix = prefix;
    this.localKeys = false;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  /** One atomic statement: start a fresh window if the old one expired, otherwise count one more hit. */
  async increment(key) {
    const { rows } = await query(
      `INSERT INTO rate_limits (key, count, reset_at)
       VALUES ($1, 1, now() + make_interval(secs => $2::double precision / 1000))
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at <= now() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
       RETURNING count, reset_at`,
      [this.prefix + key, this.windowMs],
    );
    return { totalHits: rows[0].count, resetTime: rows[0].reset_at };
  }

  async decrement(key) {
    await query("UPDATE rate_limits SET count = greatest(count - 1, 0) WHERE key = $1", [this.prefix + key]);
  }

  async resetKey(key) {
    await query("DELETE FROM rate_limits WHERE key = $1", [this.prefix + key]);
  }
}

const visitorKey = (req) => hashIp(ipKeyGenerator(req.ip ?? ""));

/** Passes the refusal to the error handler, so a 429 looks like every other API error. */
const refuse = (message) => (_req, _res, next) => next(new HttpError(429, "too_many_requests", message));

export const apiLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: env.API_RATE_LIMIT,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: visitorKey,
  handler: refuse("Too many requests. Please slow down and try again in a few minutes."),
});

export const enquiryLimiter = rateLimit({
  windowMs: env.ENQUIRY_RATE_WINDOW_MINUTES * 60_000,
  limit: env.ENQUIRY_RATE_LIMIT,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: visitorKey,
  store: new PostgresStore("api:enquiry:"),
  handler: refuse(
    "You’ve sent several enquiries in a short time. Please wait a few minutes, or call/WhatsApp us directly.",
  ),
});

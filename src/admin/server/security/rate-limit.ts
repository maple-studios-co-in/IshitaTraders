import "server-only";

import { lt, sql } from "drizzle-orm";

import { getDb } from "../db/client";
import { rateLimits } from "../db/schema";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Fixed-window counter stored in PostgreSQL, so limits hold across serverless instances.
 * One atomic upsert per call; windows restart once `reset_at` has passed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const db = await getDb();
  const resetAt = new Date(Date.now() + windowSeconds * 1000);
  const expired = sql`${rateLimits.resetAt} < now()`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${expired} then ${resetAt.toISOString()}::timestamptz else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });

  // Occasional housekeeping keeps the table small.
  if (Math.random() < 0.02) {
    await db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date(Date.now() - 86_400_000)));
  }

  const count = row?.count ?? 1;
  return { ok: count <= limit, remaining: Math.max(0, limit - count), resetAt: row?.resetAt ?? resetAt };
}

/** Clears a counter, e.g. after a successful sign-in. */
export async function resetRateLimit(key: string) {
  const db = await getDb();
  await db.delete(rateLimits).where(sql`${rateLimits.key} = ${key}`);
}

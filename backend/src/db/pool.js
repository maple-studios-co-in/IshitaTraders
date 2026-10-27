/**
 * The shared PostgreSQL connection pool. A pool keeps a few connections open and lends one to each
 * query, so requests don't pay for a new connection every time. Every query in the app goes
 * through `query()` with $1, $2 … placeholders: values are sent separately from the SQL text, which
 * makes SQL injection impossible.
 *
 * The schema is owned by the website (src/admin/server/db/migrations): this API reads and writes
 * those tables but never migrates them.
 */
import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

// count(*) and other int8 values arrive as strings by default (they can exceed JS numbers);
// the counts here never come close, so read them as numbers.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number.parseInt(value, 10));

/**
 * Pool settings for a database URL. Hosted Postgres URLs (Neon) carry parameters pg doesn't use or
 * warns about: `channel_binding` is dropped, and `sslmode=require` becomes `verify-full` (what pg
 * already does, minus the warning).
 */
export function poolConfig(databaseUrl, { onVercel = false } = {}) {
  const url = new URL(databaseUrl);
  url.searchParams.delete("channel_binding");
  if (["prefer", "require", "verify-ca"].includes(url.searchParams.get("sslmode") ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  // PgBouncer-style poolers (Neon "-pooler" hosts) refuse settings sent when connecting, so the
  // statement limit below only goes to direct connections.
  const pooled = url.hostname.includes("-pooler.");

  return {
    connectionString: url.toString(),
    max: env.DATABASE_POOL_MAX,
    // A Vercel function is frozen between requests, so it closes idle connections sooner.
    idleTimeoutMillis: onVercel ? 5_000 : 30_000,
    // Neon can take a few seconds to wake a database that has scaled to zero.
    connectionTimeoutMillis: 10_000,
    // A runaway query is cancelled by the database after 10 s instead of holding a connection.
    ...(pooled ? {} : { statement_timeout: 10_000 }),
    application_name: "ishita-traders-api",
  };
}

export const pool = new pg.Pool(poolConfig(env.DATABASE_URL, { onVercel: env.isVercel }));

// An idle connection can drop (database restart, network blip). The pool replaces it; just log it.
pool.on("error", (error) => logger.error({ err: error }, "idle database connection failed"));

// On Vercel, keeps the function awake until idle connections are closed, so a frozen function never
// wakes up holding dead sockets. Elsewhere it does nothing.
attachDatabasePool(pool);

/** Runs one parameterised query and returns pg's result ({ rows, rowCount, … }). */
export function query(text, params = []) {
  return pool.query(text, params);
}

/** Finishes in-flight queries and closes every connection (graceful shutdown, end of tests). */
export function closePool() {
  return pool.end();
}

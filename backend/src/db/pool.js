/**
 * The shared PostgreSQL connection pool. A pool keeps a few connections open and lends one to each
 * query, so requests don't pay for a new connection every time. Every query in the app goes
 * through `query()` with $1, $2 … placeholders: values are sent separately from the SQL text, which
 * makes SQL injection impossible.
 *
 * The schema is owned by the website (src/admin/server/db/migrations): this API reads and writes
 * those tables but never migrates them.
 */
import pg from "pg";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

// count(*) and other int8 values arrive as strings by default (they can exceed JS numbers);
// the counts here never come close, so read them as numbers.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number.parseInt(value, 10));

/**
 * Hosted Postgres URLs (Neon) carry parameters pg doesn't use or warns about: `channel_binding` is
 * dropped, and `sslmode=require` becomes `verify-full` (what pg already does, minus the warning).
 */
function normalizeDatabaseUrl(raw) {
  const url = new URL(raw);
  url.searchParams.delete("channel_binding");
  if (["prefer", "require", "verify-ca"].includes(url.searchParams.get("sslmode") ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

export const pool = new pg.Pool({
  connectionString: normalizeDatabaseUrl(env.DATABASE_URL),
  max: env.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // A runaway query is cancelled by the database after 10 s instead of holding a connection.
  statement_timeout: 10_000,
  application_name: "ishita-traders-api",
});

// An idle connection can drop (database restart, network blip). The pool replaces it; just log it.
pool.on("error", (error) => logger.error({ err: error }, "idle database connection failed"));

/** Runs one parameterised query and returns pg's result ({ rows, rowCount, … }). */
export function query(text, params = []) {
  return pool.query(text, params);
}

/** Finishes in-flight queries and closes every connection (graceful shutdown, end of tests). */
export function closePool() {
  return pool.end();
}

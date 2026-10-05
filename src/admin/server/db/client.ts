import "server-only";

import path from "node:path";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { env } from "../env";
import { runMigrations } from "./migrate";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

export type Database = PostgresJsDatabase<typeof schema>;

export class DatabaseUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DatabaseUnavailableError";
  }
}

const globalForDb = globalThis as unknown as { __ishitaDb?: Promise<Database> };

/**
 * The shared database connection, ready to use (migrated and seeded).
 *
 * - `DATABASE_URL` set → any PostgreSQL server (Neon, Supabase, RDS…) through postgres.js.
 * - Not set, outside production → an embedded PGlite database under `LOCAL_DATA_DIR`, so the
 *   admin works locally with zero setup.
 */
export function getDb(): Promise<Database> {
  if (!globalForDb.__ishitaDb) {
    globalForDb.__ishitaDb = connect().catch((error: unknown) => {
      // Let the next call retry instead of caching the failure forever.
      globalForDb.__ishitaDb = undefined;
      throw error;
    });
  }
  return globalForDb.__ishitaDb;
}

export function isDatabaseConfigured() {
  return Boolean(env.databaseUrl) || !env.isVercel;
}

async function connect(): Promise<Database> {
  const db = env.databaseUrl ? await connectPostgres(env.databaseUrl) : await connectEmbedded();
  await runMigrations(db, env.databaseUrl ? "postgres" : "pglite");
  await seedIfEmpty(db);
  return db;
}

async function connectPostgres(url: string): Promise<Database> {
  const [{ default: postgres }, { drizzle }] = await Promise.all([
    import("postgres"),
    import("drizzle-orm/postgres-js"),
  ]);
  const client = postgres(url, {
    // Works behind PgBouncer-style poolers (Neon "-pooler" hosts) and on serverless functions.
    prepare: false,
    max: env.isVercel ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  });
  return drizzle(client, { schema });
}

async function connectEmbedded(): Promise<Database> {
  if (env.isVercel || env.isProduction) {
    throw new DatabaseUnavailableError(
      "DATABASE_URL is not set. Connect a PostgreSQL database (e.g. Neon) to enable the admin in production.",
    );
  }
  if (env.isBuild) {
    // `next build` prerenders in parallel workers; one embedded database can't be shared across
    // processes, so public pages build from their defaults and refresh at runtime.
    throw new DatabaseUnavailableError("The embedded database is not used during `next build`.");
  }
  const [{ PGlite }, { drizzle }, { mkdir }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("node:fs/promises"),
  ]);
  const dataDir = path.join(env.localDataDir, "pglite");
  await mkdir(env.localDataDir, { recursive: true });
  const client = await PGlite.create(dataDir);
  return drizzle(client, { schema }) as unknown as Database;
}

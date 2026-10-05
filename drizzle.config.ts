import os from "node:os";
import path from "node:path";

import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL?.trim();
const localDataDir = process.env.LOCAL_DATA_DIR?.trim() || path.join(os.homedir(), ".ishita-traders");

/**
 * `npm run db:generate` writes SQL migrations from the schema; the app applies them on startup.
 * `npm run db:studio` browses the database: the PostgreSQL in DATABASE_URL, or the local embedded one.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/admin/server/db/schema.ts",
  out: "./src/admin/server/db/migrations",
  ...(databaseUrl
    ? { dbCredentials: { url: databaseUrl } }
    : { driver: "pglite", dbCredentials: { url: path.join(localDataDir, "pglite") } }),
  strict: true,
  verbose: true,
});

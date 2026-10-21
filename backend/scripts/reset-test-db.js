/**
 * Rebuilds the TEST database before `npm test`: drops every table, applies the website's migrations
 * (src/admin/server/db/migrations — the production schema) and loads tests/fixtures. Tests then run
 * against a known, identical starting point every time, on a laptop or in CI.
 *
 * Safety: refuses to run unless NODE_ENV is "test" and the database name ends in "_test", so a
 * mistyped DATABASE_URL can never wipe a real database.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import { loadFixtures } from "../tests/fixtures/catalog.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(here, "../../src/admin/server/db/migrations");

const url = process.env.DATABASE_URL;
const database = url ? decodeURIComponent(new URL(url).pathname.slice(1)) : "";

if (process.env.NODE_ENV !== "test" || !database.endsWith("_test")) {
  console.error(
    `Refusing to reset "${database || "(no DATABASE_URL)"}": NODE_ENV must be "test" and the database name must end in _test.`,
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query("DROP SCHEMA IF EXISTS public CASCADE");
  await client.query("CREATE SCHEMA public");

  const migrations = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of migrations) {
    await client.query(await readFile(path.join(MIGRATIONS_DIR, file), "utf8"));
  }

  await loadFixtures(client);
  console.log(`Test database "${database}" rebuilt: ${migrations.length} migration(s) and fixtures applied.`);
} finally {
  await client.end();
}

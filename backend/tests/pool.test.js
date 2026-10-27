// Database connection settings: hosted-database URLs, PgBouncer poolers and Vercel.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { poolConfig } from "../src/db/pool.js";

const NEON = "postgres://user:secret@ep-quiet-sun-123456.ap-southeast-1.aws.neon.tech/neondb";
const NEON_POOLER = "postgres://user:secret@ep-quiet-sun-123456-pooler.ap-southeast-1.aws.neon.tech/neondb";

describe("database pool settings", () => {
  it("drops channel_binding and verifies the server's certificate", () => {
    const url = new URL(poolConfig(`${NEON}?sslmode=require&channel_binding=require`).connectionString);
    assert.equal(url.searchParams.get("sslmode"), "verify-full");
    assert.equal(url.searchParams.has("channel_binding"), false);
  });

  it("sends the statement limit on direct connections only (poolers refuse it)", () => {
    assert.equal(poolConfig(NEON).statement_timeout, 10_000);
    assert.equal("statement_timeout" in poolConfig(NEON_POOLER), false);
  });

  it("closes idle connections sooner on Vercel", () => {
    assert.equal(poolConfig(NEON, { onVercel: true }).idleTimeoutMillis, 5_000);
    assert.equal(poolConfig(NEON).idleTimeoutMillis, 30_000);
  });
});

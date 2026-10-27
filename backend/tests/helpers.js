/**
 * Shared test setup: the app instance Vercel and server.js run, driven in memory by supertest (no
 * port needed), plus helpers to reset the tables a test writes to. The pool is closed after each
 * test file.
 */
import { after } from "node:test";

import request from "supertest";

import app from "../src/app.js";
import { closePool, query } from "../src/db/pool.js";

export { app };

export const api = () => request(app);

export const ALLOWED_ORIGIN = "http://localhost:3070";

export const ADMIN_KEY = process.env.ADMIN_API_KEY;

/** Empties the tables enquiry tests write to (fixtures in other tables stay). */
export async function resetEnquiries() {
  await query("TRUNCATE enquiries, rate_limits");
}

export { query };

after(() => closePool());

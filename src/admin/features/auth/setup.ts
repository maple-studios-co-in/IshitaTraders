import "server-only";

import { count } from "drizzle-orm";

import { getDb } from "@/admin/server/db/client";
import { users } from "@/admin/server/db/schema";
import { env } from "@/admin/server/env";

export type SetupStatus =
  | { state: "ready" }
  | { state: "first-sign-in" }
  | { state: "needs-owner" }
  | { state: "database-error"; message: string };

/** What the login page should tell a visitor before anyone has signed in. */
export async function getSetupStatus(): Promise<SetupStatus> {
  try {
    const db = await getDb();
    const [{ total }] = await db.select({ total: count() }).from(users);
    if (total > 0) return { state: "ready" };
    return env.adminEmail && env.adminPassword ? { state: "first-sign-in" } : { state: "needs-owner" };
  } catch (error) {
    return {
      state: "database-error",
      message: error instanceof Error ? error.message : "Check the DATABASE_URL setting.",
    };
  }
}

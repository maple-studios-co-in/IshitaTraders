import "server-only";

import { DatabaseUnavailableError } from "@/admin/server/db/client";

const reported = new Set<string>();

/**
 * Public pages never fail because the database is missing or down: they render built-in content
 * instead. Expected cases (no DATABASE_URL, `next build` without one) are logged once, quietly.
 */
export function reportContentFallback(area: string, error: unknown) {
  const expected = error instanceof DatabaseUnavailableError;
  const key = `${area}:${expected}`;
  if (reported.has(key)) return;
  reported.add(key);
  if (expected) console.info(`[content] ${area}: using built-in content (${(error as Error).message})`);
  else console.error(`[content] ${area}: database read failed, using built-in content`, error);
}

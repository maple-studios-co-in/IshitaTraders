import "server-only";

import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { getDb } from "@/admin/server/db/client";
import { redirects } from "@/admin/server/db/schema";

/** `%term%` for ILIKE, with the wildcard characters in the term escaped. */
const contains = (term: string) => `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

export type RedirectRow = typeof redirects.$inferSelect;

export async function listRedirects({
  q,
  status,
  page,
  pageSize,
}: {
  q: string;
  status: "active" | "paused" | "";
  page: number;
  pageSize: number;
}) {
  const db = await getDb();
  const conditions: SQL[] = [];
  if (q) conditions.push(or(ilike(redirects.source, contains(q)), ilike(redirects.destination, contains(q)))!);
  const searchOnly = conditions.length ? and(...conditions) : undefined;
  if (status) conditions.push(eq(redirects.isActive, status === "active"));
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }], byState] = await Promise.all([
    db
      .select()
      .from(redirects)
      .where(where)
      .orderBy(desc(redirects.createdAt), desc(redirects.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(redirects).where(where),
    db
      .select({ isActive: redirects.isActive, total: count() })
      .from(redirects)
      .where(searchOnly)
      .groupBy(redirects.isActive),
  ]);

  const counts = { all: 0, active: 0, paused: 0 };
  for (const row of byState) {
    counts[row.isActive ? "active" : "paused"] = row.total;
    counts.all += row.total;
  }
  return { rows, total, counts };
}

export async function getRedirect(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(redirects).where(eq(redirects.id, id)).limit(1);
  return row ?? null;
}

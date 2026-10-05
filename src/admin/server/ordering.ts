import "server-only";

import { asc, eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import { getDb } from "./db/client";

type Sortable = PgTable & { id: PgColumn; sortOrder: PgColumn };

/**
 * Moves a row one place up or down in a manually ordered list by swapping `sort_order` with its
 * neighbour (renumbering first, so gaps and duplicates from older data are fixed on the way).
 */
export async function moveRow(table: Sortable, id: string, direction: "up" | "down") {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const rows = (await tx
      .select({ id: table.id, sortOrder: table.sortOrder })
      .from(table as PgTable)
      .orderBy(asc(table.sortOrder))) as { id: string; sortOrder: number }[];
    const index = rows.findIndex((row) => row.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    for (const [position, row] of rows.entries()) {
      if (row.sortOrder !== position) {
        await tx
          .update(table)
          .set({ sortOrder: position } as never)
          .where(eq(table.id, row.id));
      }
    }
  });
}

/** The next free position at the end of a list. */
export async function nextSortOrder(table: Sortable) {
  const db = await getDb();
  const rows = (await db.select({ sortOrder: table.sortOrder }).from(table as PgTable)) as { sortOrder: number }[];
  return rows.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);
}

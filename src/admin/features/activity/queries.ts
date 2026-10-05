import "server-only";

import { and, asc, count, desc, eq, gte, ilike, lt, lte, or, type SQL } from "drizzle-orm";

import { getDb } from "@/admin/server/db/client";
import { activityLog } from "@/admin/server/db/schema";

export type ActivityRow = typeof activityLog.$inferSelect;

export const ACTIVITY_PAGE_SIZE = 30;
/** CSV exports stop here; narrow the date range for older history. */
export const ACTIVITY_EXPORT_LIMIT = 50_000;

export interface ActivityFilters {
  /** Free text over the summary, the person and the entity id. */
  q: string;
  entity: string;
  action: string;
  /** Inclusive calendar days (YYYY-MM-DD) in India Standard Time, like every date in the admin. */
  from: string;
  to: string;
}

const IST_OFFSET = "+05:30";
const DAY_MS = 86_400_000;

/** Reads filters from page search params or a request's URLSearchParams. */
export function readActivityFilters(get: (key: string) => string | null | undefined): ActivityFilters {
  const text = (key: string, max: number) => (get(key) ?? "").trim().slice(0, max);
  const day = (key: string) => {
    const value = text(key, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00${IST_OFFSET}`))
      ? value
      : "";
  };
  return {
    q: text("q", 100),
    entity: text("entity", 60),
    action: text("action", 80),
    from: day("from"),
    to: day("to"),
  };
}

export function hasActivityFilters(filters: ActivityFilters) {
  return Object.values(filters).some(Boolean);
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function activityWhere(filters: ActivityFilters, until?: Date): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];
  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    conditions.push(
      or(
        ilike(activityLog.summary, pattern),
        ilike(activityLog.actorName, pattern),
        ilike(activityLog.entityId, pattern),
      ),
    );
  }
  if (filters.entity) conditions.push(eq(activityLog.entityType, filters.entity));
  if (filters.action) conditions.push(eq(activityLog.action, filters.action));
  if (filters.from) conditions.push(gte(activityLog.createdAt, new Date(`${filters.from}T00:00:00${IST_OFFSET}`)));
  if (filters.to) {
    conditions.push(lt(activityLog.createdAt, new Date(Date.parse(`${filters.to}T00:00:00${IST_OFFSET}`) + DAY_MS)));
  }
  if (until) conditions.push(lte(activityLog.createdAt, until));
  const defined = conditions.filter((condition): condition is SQL => condition !== undefined);
  return defined.length > 0 ? and(...defined) : undefined;
}

/** One page of the log, newest first. Out-of-range pages are clamped to the last page. */
export async function listActivity(filters: ActivityFilters, page: number, pageSize = ACTIVITY_PAGE_SIZE) {
  const db = await getDb();
  const where = activityWhere(filters);
  const [{ total }] = await db.select({ total: count() }).from(activityLog).where(where);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), lastPage);
  const rows = await db
    .select()
    .from(activityLog)
    .where(where)
    .orderBy(desc(activityLog.createdAt), desc(activityLog.id))
    .limit(pageSize)
    .offset((current - 1) * pageSize);
  return { rows, total, page: current };
}

/** Distinct entity types and actions, for the filter dropdowns. */
export async function getActivityFacets() {
  const db = await getDb();
  const [entities, actions] = await Promise.all([
    db
      .selectDistinct({ value: activityLog.entityType })
      .from(activityLog)
      .orderBy(asc(activityLog.entityType))
      .limit(200),
    db.selectDistinct({ value: activityLog.action }).from(activityLog).orderBy(asc(activityLog.action)).limit(400),
  ]);
  return { entityTypes: entities.map((row) => row.value), actions: actions.map((row) => row.value) };
}

/**
 * Matching rows in batches, newest first, for the CSV export. Rows logged after the export began
 * are excluded so paging stays stable while people keep working.
 */
export async function* activityBatches(
  filters: ActivityFilters,
  { batchSize = 1000, limit = ACTIVITY_EXPORT_LIMIT } = {},
) {
  const db = await getDb();
  const where = activityWhere(filters, new Date());
  for (let offset = 0; offset < limit; offset += batchSize) {
    const rows = await db
      .select()
      .from(activityLog)
      .where(where)
      .orderBy(desc(activityLog.createdAt), desc(activityLog.id))
      .limit(Math.min(batchSize, limit - offset))
      .offset(offset);
    if (rows.length > 0) yield rows;
    if (rows.length < batchSize) return;
  }
}

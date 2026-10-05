import "server-only";

import { asc, count, desc, eq, ne, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { getDb } from "@/admin/server/db/client";
import {
  activityLog,
  brands,
  categories,
  enquiries,
  faqs,
  leadEvents,
  media,
  messages,
  notes,
  pages,
  pageVersions,
  products,
  redirects,
  settings,
  testimonials,
  users,
} from "@/admin/server/db/schema";

import { ACTIVITY_LOG_LIMIT, BACKUP_FORMAT, BACKUP_VERSION, type BackupTable } from "./format";

/** The only user columns that ever leave the server: no password hash, lock-out state or sessions. */
const exportedUserColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
};

const tableSources: Record<BackupTable, PgTable> = {
  settings,
  brands,
  categories,
  products,
  testimonials,
  faqs,
  pages,
  page_versions: pageVersions,
  redirects,
  enquiries,
  messages,
  notes,
  lead_events: leadEvents,
  media,
  activity_log: activityLog,
  users,
};

/**
 * Everything the admin stores, as one JSON-ready object. Read in a single read-only,
 * repeatable-read transaction, so every table comes from the same moment (no product pointing at a
 * brand that was deleted halfway through the export).
 */
export async function buildBackup() {
  const db = await getDb();
  return db.transaction(
    async (tx) => {
      const tables = {
        // The owner-password fingerprint (a keyed hash) is an internal security record, not content.
        settings: await tx
          .select()
          .from(settings)
          .where(ne(settings.key, "__owner_env_password"))
          .orderBy(asc(settings.key)),
        brands: await tx.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.createdAt)),
        categories: await tx.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.createdAt)),
        products: await tx.select().from(products).orderBy(asc(products.sortOrder), asc(products.createdAt)),
        testimonials: await tx
          .select()
          .from(testimonials)
          .orderBy(asc(testimonials.sortOrder), asc(testimonials.createdAt)),
        faqs: await tx.select().from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.createdAt)),
        pages: await tx.select().from(pages).orderBy(asc(pages.createdAt)),
        page_versions: await tx.select().from(pageVersions).orderBy(asc(pageVersions.createdAt)),
        redirects: await tx.select().from(redirects).orderBy(asc(redirects.createdAt)),
        enquiries: await tx.select().from(enquiries).orderBy(asc(enquiries.createdAt)),
        messages: await tx.select().from(messages).orderBy(asc(messages.occurredAt)),
        notes: await tx.select().from(notes).orderBy(asc(notes.createdAt)),
        lead_events: await tx.select().from(leadEvents).orderBy(asc(leadEvents.createdAt)),
        // Metadata only: the bytes of database-stored files live in media_blobs, which is never exported.
        media: await tx.select().from(media).orderBy(asc(media.createdAt)),
        activity_log: await tx
          .select()
          .from(activityLog)
          .orderBy(desc(activityLog.createdAt))
          .limit(ACTIVITY_LOG_LIMIT),
        users: await tx.select(exportedUserColumns).from(users).orderBy(asc(users.createdAt)),
      } satisfies Record<BackupTable, unknown[]>;
      return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export type Backup = Awaited<ReturnType<typeof buildBackup>>;

export function backupRowCount(backup: Backup) {
  return Object.values(backup.tables).reduce((total, rows) => total + rows.length, 0);
}

/** `ishita-traders-backup-2026-10-05.json` (date in India Standard Time). */
export function backupFileName(date = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return `ishita-traders-backup-${day}.json`;
}

export interface BackupSummary {
  /** Rows each table contributes to a backup (the activity log is capped). */
  counts: Record<BackupTable, number>;
  mediaFiles: number;
  mediaBytes: number;
  lastExport: { at: Date; by: string } | null;
}

export async function getBackupSummary(): Promise<BackupSummary> {
  const db = await getDb();
  const entries = await Promise.all(
    (Object.entries(tableSources) as [BackupTable, PgTable][]).map(async ([name, table]) => {
      const [row] = await db.select({ total: count() }).from(table);
      return [name, row?.total ?? 0] as const;
    }),
  );
  const counts = Object.fromEntries(entries) as Record<BackupTable, number>;
  counts.activity_log = Math.min(counts.activity_log, ACTIVITY_LOG_LIMIT);

  const [[bytes], [last]] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${media.size}), 0)`.mapWith(Number) }).from(media),
    db
      .select({ at: activityLog.createdAt, by: activityLog.actorName })
      .from(activityLog)
      .where(eq(activityLog.action, "backup.export"))
      .orderBy(desc(activityLog.createdAt))
      .limit(1),
  ]);

  return {
    counts,
    mediaFiles: counts.media,
    mediaBytes: bytes?.total ?? 0,
    lastExport: last ? { at: last.at, by: last.by } : null,
  };
}

import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/admin/server/db/client";
import { settings } from "@/admin/server/db/schema";

import { AUDIT_SETTINGS_KEY, isAuditReport, type AuditReport } from "./audit-types";

/** The last stored audit report (settings row `__seo_audit`), or null before the first run. */
export async function getLastAuditReport(): Promise<AuditReport | null> {
  const db = await getDb();
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, AUDIT_SETTINGS_KEY))
    .limit(1);
  return row && isAuditReport(row.value) ? row.value : null;
}

/** Replaces the stored report (one row, upserted). */
export async function saveAuditReport(report: AuditReport, userId: string | null) {
  const db = await getDb();
  const now = new Date();
  await db
    .insert(settings)
    .values({ key: AUDIT_SETTINGS_KEY, value: report, updatedAt: now, updatedBy: userId })
    .onConflictDoUpdate({ target: settings.key, set: { value: report, updatedAt: now, updatedBy: userId } });
}

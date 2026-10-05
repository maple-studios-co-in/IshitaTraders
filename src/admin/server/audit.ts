import "server-only";

import { getDb } from "./db/client";
import { activityLog } from "./db/schema";
import { getRequestMeta } from "./security/request";
import type { SessionUser } from "./auth/session";

export interface ActivityEntry {
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

/** Records an admin action in the audit trail. Never blocks or fails the action itself. */
export async function logActivity(actor: SessionUser | null, entry: ActivityEntry) {
  try {
    const [db, meta] = await Promise.all([getDb(), getRequestMeta().catch(() => ({ ip: "" }))]);
    await db.insert(activityLog).values({
      actorId: actor?.id ?? null,
      actorName: actor ? `${actor.name} <${actor.email}>` : "System",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? "",
      summary: entry.summary,
      changes: entry.changes ?? {},
      ip: meta.ip,
    });
  } catch (error) {
    console.error("[audit] Failed to record activity", error);
  }
}

/** Field-level diff for the audit trail (shallow; values compared as JSON). */
export function diff<T extends Record<string, unknown>>(
  before: Partial<T> | null,
  after: Partial<T>,
  fields?: (keyof T)[],
) {
  const keys = (fields ?? (Object.keys(after) as (keyof T)[])).filter((key) => key !== "updatedAt");
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of keys) {
    const from = before?.[key] ?? null;
    const to = after[key] ?? null;
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[String(key)] = { from: trim(from), to: trim(to) };
  }
  return changes;
}

function trim(value: unknown) {
  if (typeof value === "string" && value.length > 300) return `${value.slice(0, 300)}…`;
  return value;
}

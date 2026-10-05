import type { NextRequest } from "next/server";

import { CSV_BOM, csvRow } from "@/admin/features/activity/csv";
import { changeEntries, splitActor } from "@/admin/features/activity/format";
import {
  activityBatches,
  hasActivityFilters,
  readActivityFilters,
  type ActivityFilters,
  type ActivityRow,
} from "@/admin/features/activity/queries";
import { logActivity } from "@/admin/server/audit";
import { AuthError, assertPermission, getCurrentUser } from "@/admin/server/auth/guard";

const HEADER = [
  "Time (IST)",
  "Time (UTC)",
  "Person",
  "Email",
  "Action",
  "Entity type",
  "Entity ID",
  "Summary",
  "Changes",
  "IP address",
] as const;

const istParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** "2026-10-05 21:03:12" — sorts correctly and spreadsheets read it as a date. */
function istTimestamp(date: Date) {
  const part = Object.fromEntries(istParts.formatToParts(date).map((item) => [item.type, item.value]));
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}:${part.second}`;
}

/** A diff value on one line (strings as they are, the rest as JSON). Cells are capped by csvCell. */
function compact(value: unknown) {
  if (value === null || value === undefined || value === "") return "(empty)";
  return typeof value === "string" ? value : JSON.stringify(value);
}

function toCsv(row: ActivityRow) {
  const actor = splitActor(row.actorName);
  const changes = changeEntries(row.changes)
    .map((change) => `${change.field}: ${compact(change.from)} → ${compact(change.to)}`)
    .join("; ");
  return csvRow([
    istTimestamp(row.createdAt),
    row.createdAt.toISOString(),
    actor.name,
    actor.email,
    row.action,
    row.entityType,
    row.entityId,
    row.summary,
    changes,
    row.ip,
  ]);
}

function describeFilters(filters: ActivityFilters) {
  return [
    filters.q ? `search “${filters.q}”` : "",
    filters.entity ? `entity ${filters.entity}` : "",
    filters.action ? `action ${filters.action}` : "",
    filters.from ? `from ${filters.from}` : "",
    filters.to ? `to ${filters.to}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

/** The activity log as CSV, with the same filters as the page (`q`, `entity`, `action`, `from`, `to`). */
export async function GET(request: NextRequest) {
  let user;
  try {
    user = await assertPermission("activity:read");
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    const status = (await getCurrentUser()) ? 403 : 401;
    return new Response(error.message, {
      status,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const filters = readActivityFilters((key) => request.nextUrl.searchParams.get(key));
  const filtered = hasActivityFilters(filters);
  await logActivity(user, {
    action: "activity.export",
    entityType: "activity",
    summary: `Exported the activity log as CSV${filtered ? ` (${describeFilters(filters)})` : ""}`,
  });

  const batches = activityBatches(filters);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`${CSV_BOM}${csvRow(HEADER)}`));
    },
    async pull(controller) {
      try {
        const { value, done } = await batches.next();
        if (done) controller.close();
        else controller.enqueue(encoder.encode(value.map(toCsv).join("")));
      } catch (error) {
        console.error("[activity] CSV export failed", error);
        controller.error(error);
      }
    },
    async cancel() {
      await batches.return(undefined);
    },
  });

  const day = istTimestamp(new Date()).slice(0, 10);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ishita-activity-log-${day}${filtered ? "-filtered" : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

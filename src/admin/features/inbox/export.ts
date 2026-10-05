import "server-only";

import { desc, eq } from "drizzle-orm";

import type { SearchParams } from "@/admin/components/ui/listing";
import { leadEventLabels, messageChannelLabels, messageStatusLabels } from "@/admin/content/types";
import { logActivity } from "@/admin/server/audit";
import { AuthError, assertPermission, getCurrentUser } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { leadEvents, messages, products, users } from "@/admin/server/db/schema";

import { csvDateTime, istDate, toCsv } from "./csv";
import { clickWhere, messageWhere, parseClickFilters, parseMessageFilters } from "./queries";

/** Large enough for years of a small business's inbox, small enough to build in memory. */
const MAX_ROWS = 20_000;

const searchParamsOf = (url: URL): SearchParams => Object.fromEntries(url.searchParams.entries());

function csvResponse(csv: string, name: string) {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * `GET /api/admin/export/inbox?kind=messages|clicks&…filters` — the inbox list (same filters as the
 * page) as CSV. Session + `inbox:read` checked here: this route sits outside the /admin proxy.
 */
export async function exportInbox(request: Request): Promise<Response> {
  const denied = (status: 401 | 403, message: string) =>
    new Response(message, { status, headers: { "Cache-Control": "no-store" } });
  if (!(await getCurrentUser())) return denied(401, "Sign in to the admin to export.");
  let user;
  try {
    user = await assertPermission("inbox:read");
  } catch (error) {
    if (error instanceof AuthError) return denied(403, error.message);
    throw error;
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "messages";
  const params = searchParamsOf(url);
  const db = await getDb();

  if (kind === "messages") {
    const rows = await db
      .select({
        occurredAt: messages.occurredAt,
        channel: messages.channel,
        direction: messages.direction,
        status: messages.status,
        isRead: messages.isRead,
        contactName: messages.contactName,
        contactPhone: messages.contactPhone,
        contactEmail: messages.contactEmail,
        subject: messages.subject,
        body: messages.body,
        productName: products.name,
        source: messages.source,
        assignee: users.name,
        id: messages.id,
      })
      .from(messages)
      .leftJoin(products, eq(products.id, messages.productId))
      .leftJoin(users, eq(users.id, messages.assignedTo))
      .where(messageWhere(parseMessageFilters(params)))
      .orderBy(desc(messages.occurredAt), desc(messages.id))
      .limit(MAX_ROWS);

    const csv = toCsv(
      [
        "Date (IST)",
        "Channel",
        "Direction",
        "Status",
        "Read",
        "Name",
        "Phone",
        "Email",
        "Subject",
        "Message",
        "Product",
        "Source",
        "Assigned to",
        "ID",
      ],
      rows.map((row) => [
        csvDateTime(row.occurredAt),
        messageChannelLabels[row.channel],
        row.direction === "outbound" ? "Outgoing" : "Incoming",
        messageStatusLabels[row.status],
        row.isRead,
        row.contactName,
        row.contactPhone,
        row.contactEmail,
        row.subject,
        row.body,
        row.productName ?? "",
        row.source === "manual" ? "Logged manually" : "Webhook",
        row.assignee ?? "",
        row.id,
      ]),
    );
    await logActivity(user, {
      action: "inbox.export",
      entityType: "message",
      summary: `Exported ${rows.length.toLocaleString("en-IN")} inbox messages to CSV`,
    });
    return csvResponse(csv, `ishita-traders-inbox-${istDate()}.csv`);
  }

  if (kind === "clicks") {
    const rows = await db
      .select({
        createdAt: leadEvents.createdAt,
        type: leadEvents.type,
        context: leadEvents.context,
        productSlug: leadEvents.productSlug,
        productName: products.name,
        message: leadEvents.message,
        target: leadEvents.target,
        pagePath: leadEvents.pagePath,
        referrer: leadEvents.referrer,
        utm: leadEvents.utm,
      })
      .from(leadEvents)
      .leftJoin(products, eq(products.slug, leadEvents.productSlug))
      .where(clickWhere(parseClickFilters(params)))
      .orderBy(desc(leadEvents.createdAt), desc(leadEvents.id))
      .limit(MAX_ROWS);

    const csv = toCsv(
      [
        "Date (IST)",
        "Type",
        "Section",
        "Product",
        "Pre-filled message",
        "Number / address",
        "Page",
        "Referrer",
        "UTM source",
        "UTM medium",
        "UTM campaign",
      ],
      rows.map((row) => [
        csvDateTime(row.createdAt),
        leadEventLabels[row.type],
        row.context,
        row.productName ?? row.productSlug,
        row.message,
        row.target,
        row.pagePath,
        row.referrer,
        row.utm.source ?? "",
        row.utm.medium ?? "",
        row.utm.campaign ?? "",
      ]),
    );
    await logActivity(user, {
      action: "inbox.export",
      entityType: "lead_event",
      summary: `Exported ${rows.length.toLocaleString("en-IN")} contact clicks to CSV`,
    });
    return csvResponse(csv, `ishita-traders-contact-clicks-${istDate()}.csv`);
  }

  return new Response("Unknown export. Use kind=messages or kind=clicks.", {
    status: 400,
    headers: { "Cache-Control": "no-store" },
  });
}

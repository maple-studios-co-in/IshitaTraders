import "server-only";

import { sql } from "drizzle-orm";
import { after } from "next/server";

import { getSiteSettings } from "@/admin/content/settings";
import { messageChannelLabels, type MessageChannel, type MessageDirection } from "@/admin/content/types";
import { formatDateTime, formatPhone } from "@/admin/lib/format";
import { getDb } from "@/admin/server/db/client";
import { leadEvents, messages, products } from "@/admin/server/db/schema";
import { isEmailConfigured, sendAdminEmail } from "@/admin/server/notify";
import { siteConfig } from "@/config/site";

import { matchProduct, truncate, type IncomingMessage, type TrackBeacon } from "./ingest";

export interface IngestResult {
  stored: number;
  duplicates: number;
}

interface StoredMessage {
  id: string;
  channel: MessageChannel;
  direction: MessageDirection;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  subject: string;
  body: string;
  occurredAt: Date;
}

/**
 * Stores webhook messages. Idempotent: a provider id already stored for the channel is skipped
 * (`ON CONFLICT DO NOTHING` on the partial unique index), so webhook retries never duplicate.
 * New inbound messages are emailed to the team after the response, when that's switched on.
 */
export async function ingestMessages(items: IncomingMessage[]): Promise<IngestResult> {
  // The same provider id twice in one delivery counts once.
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    if (!item.externalId) return true;
    const key = `${item.channel}:${item.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length === 0) return { stored: 0, duplicates: items.length };

  const db = await getDb();
  const catalog = unique.some((item) => item.body || item.subject)
    ? await db.select({ id: products.id, name: products.name }).from(products)
    : [];

  const stored: StoredMessage[] = await db
    .insert(messages)
    .values(
      unique.map((item) => ({
        channel: item.channel,
        direction: item.direction,
        status: "new" as const,
        isRead: false,
        contactName: item.contactName,
        contactPhone: item.contactPhone,
        contactEmail: item.contactEmail,
        subject: item.subject,
        body: item.body,
        externalId: item.externalId,
        source: "webhook" as const,
        meta: item.meta,
        productId:
          item.direction === "inbound" ? (matchProduct(`${item.subject}\n${item.body}`, catalog)?.id ?? null) : null,
        occurredAt: item.occurredAt,
      })),
    )
    .onConflictDoNothing({ target: [messages.channel, messages.externalId], where: sql`external_id is not null` })
    .returning({
      id: messages.id,
      channel: messages.channel,
      direction: messages.direction,
      contactName: messages.contactName,
      contactPhone: messages.contactPhone,
      contactEmail: messages.contactEmail,
      subject: messages.subject,
      body: messages.body,
      occurredAt: messages.occurredAt,
    });

  const inbound = stored.filter((row) => row.direction === "inbound");
  if (inbound.length > 0) after(() => notifyTeam(inbound));

  return { stored: stored.length, duplicates: items.length - stored.length };
}

const contactLabel = (row: Pick<StoredMessage, "contactName" | "contactPhone" | "contactEmail">) =>
  [row.contactName, row.contactPhone ? formatPhone(row.contactPhone) : "", row.contactEmail]
    .filter(Boolean)
    .join(" · ") || "an unknown contact";

/** Emails the team about new messages when Settings → Notifications → message emails is on. */
async function notifyTeam(rows: StoredMessage[]) {
  try {
    if (!isEmailConfigured()) return;
    const { notifications } = await getSiteSettings();
    if (!notifications.messageEmails) return;

    const first = rows[0];
    const channel = messageChannelLabels[first.channel];
    const sameChannel = rows.every((row) => row.channel === first.channel);
    const subject =
      rows.length === 1
        ? `New ${channel.toLowerCase()} message from ${first.contactName || formatPhone(first.contactPhone) || first.contactEmail || "a customer"}`
        : `${rows.length} new ${sameChannel ? `${channel.toLowerCase()} ` : ""}messages in the inbox`;

    const blocks = rows
      .slice(0, 10)
      .map((row) =>
        [
          `${messageChannelLabels[row.channel]} from ${contactLabel(row)} — ${formatDateTime(row.occurredAt)}`,
          row.subject ? `Subject: ${row.subject}` : "",
          truncate(row.body || "(no text)", 1200),
          `Open: ${siteConfig.url}/admin/inbox/${row.id}`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    if (rows.length > 10) blocks.push(`…and ${rows.length - 10} more: ${siteConfig.url}/admin/inbox`);

    await sendAdminEmail({
      subject,
      text: [`New in the ${siteConfig.name} inbox:`, "", blocks.join("\n\n---\n\n")].join("\n"),
      replyTo: rows.length === 1 && first.contactEmail ? first.contactEmail : undefined,
    });
  } catch (error) {
    console.error("[inbox] message notification failed", error);
  }
}

/** Stores one contact-button click from the website. */
export async function recordLeadEvent(beacon: TrackBeacon, visitor: { userAgent: string; ipHash: string }) {
  const db = await getDb();
  await db.insert(leadEvents).values({
    type: beacon.type,
    context: beacon.context,
    pagePath: beacon.path,
    target: beacon.target,
    message: beacon.message,
    productSlug: beacon.productSlug,
    referrer: beacon.referrer,
    utm: beacon.utm,
    userAgent: visitor.userAgent,
    ipHash: visitor.ipHash,
  });
}

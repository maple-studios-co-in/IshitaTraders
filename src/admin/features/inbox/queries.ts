import "server-only";

import { and, asc, count, desc, eq, gt, gte, ilike, lt, max, ne, or, sql, type SQL } from "drizzle-orm";

import { param, type SearchParams } from "@/admin/components/ui/listing";
import {
  leadEventTypes,
  messageChannels,
  messageStatuses,
  type LeadEventType,
  type MessageChannel,
  type MessageStatus,
} from "@/admin/content/types";
import { getDb } from "@/admin/server/db/client";
import { leadEvents, messages, products, users } from "@/admin/server/db/schema";

export const MESSAGES_PAGE_SIZE = 25;
export const CLICKS_PAGE_SIZE = 50;

/* ---------------------------------------------------------------- filters */

export type InboxTab = "all" | MessageChannel | "clicks";

export interface MessageFilters {
  channel: MessageChannel | null;
  q: string;
  status: MessageStatus | null;
  read: "read" | "unread" | null;
}

export interface ClickFilters {
  type: LeadEventType | null;
  q: string;
  /** Inclusive dates (YYYY-MM-DD, India time). */
  from: string;
  to: string;
}

const oneOf = <T extends string>(values: readonly T[], value: string): T | null =>
  (values as readonly string[]).includes(value) ? (value as T) : null;

export function parseInboxTab(params: SearchParams): InboxTab {
  const tab = param(params, "tab");
  if (tab === "clicks") return "clicks";
  return oneOf(messageChannels, tab) ?? "all";
}

export function parseMessageFilters(params: SearchParams): MessageFilters {
  const tab = parseInboxTab(params);
  const read = param(params, "read");
  return {
    channel: tab === "all" || tab === "clicks" ? null : tab,
    q: param(params, "q").slice(0, 200),
    status: oneOf(messageStatuses, param(params, "status")),
    read: read === "read" || read === "unread" ? read : null,
  };
}

const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00+05:30`)) ? value : "";

export function parseClickFilters(params: SearchParams): ClickFilters {
  return {
    type: oneOf(leadEventTypes, param(params, "type")),
    q: param(params, "q").slice(0, 200),
    from: validDate(param(params, "from")),
    to: validDate(param(params, "to")),
  };
}

/** Start of a calendar day in India Standard Time. */
export const istDayStart = (date: string) => new Date(`${date}T00:00:00+05:30`);

/** `%term%` for ILIKE with the user's `%`, `_` and `\` taken literally. */
const likePattern = (term: string) => `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

export function messageWhere(filters: MessageFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    filters.channel ? eq(messages.channel, filters.channel) : undefined,
    // Spam stays out of the inbox unless asked for.
    filters.status ? eq(messages.status, filters.status) : ne(messages.status, "spam"),
    filters.read ? eq(messages.isRead, filters.read === "read") : undefined,
  ];
  if (filters.q) {
    const pattern = likePattern(filters.q);
    const digits = filters.q.replace(/\D/g, "");
    conditions.push(
      or(
        ilike(messages.contactName, pattern),
        ilike(messages.contactPhone, pattern),
        ilike(messages.contactEmail, pattern),
        ilike(messages.subject, pattern),
        ilike(messages.body, pattern),
        // "98765 43210" finds +919876543210.
        digits.length >= 5 && /^[\d\s+()-]+$/.test(filters.q)
          ? sql`regexp_replace(${messages.contactPhone}, '[^0-9]', '', 'g') like ${`%${digits}%`}`
          : undefined,
      ),
    );
  }
  return and(...conditions);
}

export function clickWhere(filters: ClickFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    filters.type ? eq(leadEvents.type, filters.type) : undefined,
    filters.from ? gte(leadEvents.createdAt, istDayStart(filters.from)) : undefined,
    filters.to ? lt(leadEvents.createdAt, new Date(istDayStart(filters.to).getTime() + 86_400_000)) : undefined,
  ];
  if (filters.q) {
    const pattern = likePattern(filters.q);
    conditions.push(
      or(
        ilike(leadEvents.context, pattern),
        ilike(leadEvents.message, pattern),
        ilike(leadEvents.productSlug, pattern),
        ilike(leadEvents.pagePath, pattern),
        ilike(leadEvents.referrer, pattern),
        ilike(leadEvents.target, pattern),
      ),
    );
  }
  return and(...conditions);
}

/* --------------------------------------------------------------- messages */

/** Tab counters: messages per channel (spam excluded) and all contact clicks. */
export async function getInboxCounts(): Promise<Record<InboxTab, number>> {
  const db = await getDb();
  const [byChannel, [clicks]] = await Promise.all([
    db
      .select({ channel: messages.channel, total: count() })
      .from(messages)
      .where(ne(messages.status, "spam"))
      .groupBy(messages.channel),
    db.select({ total: count() }).from(leadEvents),
  ]);
  const counts = { all: 0, clicks: clicks?.total ?? 0 } as Record<InboxTab, number>;
  for (const channel of messageChannels) counts[channel] = 0;
  for (const row of byChannel) {
    counts[row.channel] = row.total;
    counts.all += row.total;
  }
  return counts;
}

export async function listMessages(filters: MessageFilters, page: number) {
  const db = await getDb();
  const where = messageWhere(filters);
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: messages.id,
        channel: messages.channel,
        direction: messages.direction,
        status: messages.status,
        isRead: messages.isRead,
        contactName: messages.contactName,
        contactPhone: messages.contactPhone,
        contactEmail: messages.contactEmail,
        subject: messages.subject,
        snippet: sql<string>`left(${messages.body}, 240)`,
        source: messages.source,
        productId: messages.productId,
        productName: products.name,
        occurredAt: messages.occurredAt,
      })
      .from(messages)
      .leftJoin(products, eq(products.id, messages.productId))
      .where(where)
      .orderBy(desc(messages.occurredAt), desc(messages.id))
      .limit(MESSAGES_PAGE_SIZE)
      .offset((page - 1) * MESSAGES_PAGE_SIZE),
    db
      .select({
        total: count(),
        unread: sql<number>`count(*) filter (where ${messages.isRead} = false)`.mapWith(Number),
      })
      .from(messages)
      .where(where),
  ]);
  return { rows, total: totals?.total ?? 0, unread: totals?.unread ?? 0 };
}

export type MessageListRow = Awaited<ReturnType<typeof listMessages>>["rows"][number];

export async function getMessage(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({ message: messages, productName: products.name, productSlug: products.slug, assigneeName: users.name })
    .from(messages)
    .leftJoin(products, eq(products.id, messages.productId))
    .leftJoin(users, eq(users.id, messages.assignedTo))
    .where(eq(messages.id, id))
    .limit(1);
  return row ?? null;
}

/** Opening a message marks it read (only flips unread rows; returns whether it changed). */
export async function markMessageRead(id: string) {
  const db = await getDb();
  const updated = await db
    .update(messages)
    .set({ isRead: true })
    .where(and(eq(messages.id, id), eq(messages.isRead, false)))
    .returning({ id: messages.id });
  return updated.length > 0;
}

/** Previous/next message in inbox order (newest first). */
export async function getMessageNeighbours(current: { id: string; occurredAt: Date }) {
  const db = await getDb();
  const newerCondition = or(
    gt(messages.occurredAt, current.occurredAt),
    and(eq(messages.occurredAt, current.occurredAt), gt(messages.id, current.id)),
  );
  const olderCondition = or(
    lt(messages.occurredAt, current.occurredAt),
    and(eq(messages.occurredAt, current.occurredAt), lt(messages.id, current.id)),
  );
  const [[newer], [older]] = await Promise.all([
    db
      .select({ id: messages.id })
      .from(messages)
      .where(and(ne(messages.status, "spam"), newerCondition))
      .orderBy(asc(messages.occurredAt), asc(messages.id))
      .limit(1),
    db
      .select({ id: messages.id })
      .from(messages)
      .where(and(ne(messages.status, "spam"), olderCondition))
      .orderBy(desc(messages.occurredAt), desc(messages.id))
      .limit(1),
  ]);
  return { newer: newer?.id ?? null, older: older?.id ?? null };
}

export async function listProductOptions() {
  const db = await getDb();
  return db.select({ id: products.id, name: products.name }).from(products).orderBy(asc(products.name)).limit(1000);
}

/* --------------------------------------------------------- contact clicks */

export async function listClicks(filters: ClickFilters, page: number) {
  const db = await getDb();
  const where = clickWhere(filters);
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: leadEvents.id,
        type: leadEvents.type,
        context: leadEvents.context,
        pagePath: leadEvents.pagePath,
        target: leadEvents.target,
        message: leadEvents.message,
        productSlug: leadEvents.productSlug,
        productName: products.name,
        referrer: leadEvents.referrer,
        utm: leadEvents.utm,
        createdAt: leadEvents.createdAt,
      })
      .from(leadEvents)
      .leftJoin(products, eq(products.slug, leadEvents.productSlug))
      .where(where)
      .orderBy(desc(leadEvents.createdAt), desc(leadEvents.id))
      .limit(CLICKS_PAGE_SIZE)
      .offset((page - 1) * CLICKS_PAGE_SIZE),
    db.select({ total: count() }).from(leadEvents).where(where),
  ]);
  return { rows, total: totals?.total ?? 0 };
}

export type ClickListRow = Awaited<ReturnType<typeof listClicks>>["rows"][number];

/** Clicks per type over the last `days`, plus the busiest sections and products. */
export async function getClickSummary(days = 7) {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86_400_000);
  const recent = gte(leadEvents.createdAt, since);
  const [byType, topContexts, topProducts] = await Promise.all([
    db.select({ type: leadEvents.type, total: count() }).from(leadEvents).where(recent).groupBy(leadEvents.type),
    db
      .select({ context: leadEvents.context, total: count() })
      .from(leadEvents)
      .where(and(recent, ne(leadEvents.context, "")))
      .groupBy(leadEvents.context)
      .orderBy(desc(count()), asc(leadEvents.context))
      .limit(5),
    db
      .select({ slug: leadEvents.productSlug, name: max(products.name), total: count() })
      .from(leadEvents)
      .leftJoin(products, eq(products.slug, leadEvents.productSlug))
      .where(and(recent, ne(leadEvents.productSlug, "")))
      .groupBy(leadEvents.productSlug)
      .orderBy(desc(count()), asc(leadEvents.productSlug))
      .limit(5),
  ]);
  const totals = Object.fromEntries(leadEventTypes.map((type) => [type, 0])) as Record<LeadEventType, number>;
  for (const row of byType) totals[row.type] = row.total;
  return { totals, total: byType.reduce((sum, row) => sum + row.total, 0), topContexts, topProducts };
}

/* ------------------------------------------------------------ integrations */

/** When each webhook last delivered something (null = never). */
export async function getLastWebhookDeliveries() {
  const db = await getDb();
  const rows = await db
    .select({ channel: messages.channel, last: max(messages.createdAt) })
    .from(messages)
    .where(eq(messages.source, "webhook"))
    .groupBy(messages.channel);
  const last = (channel: MessageChannel) => rows.find((row) => row.channel === channel)?.last ?? null;
  const sms =
    [last("sms"), last("call")]
      .filter((date): date is Date => date !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  return { whatsapp: last("whatsapp"), email: last("email"), sms };
}

export async function getClickVolume() {
  const db = await getDb();
  const now = Date.now();
  const [[day], [week]] = await Promise.all([
    db
      .select({ total: count() })
      .from(leadEvents)
      .where(gte(leadEvents.createdAt, new Date(now - 86_400_000))),
    db
      .select({ total: count() })
      .from(leadEvents)
      .where(gte(leadEvents.createdAt, new Date(now - 7 * 86_400_000))),
  ]);
  return { last24h: day?.total ?? 0, last7d: week?.total ?? 0 };
}

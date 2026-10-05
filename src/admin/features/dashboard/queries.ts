import "server-only";

import { and, count, desc, eq, gte, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";

import type { SeriesPoint } from "@/admin/components/ui/charts";
import { getDb } from "@/admin/server/db/client";
import {
  activityLog,
  enquiries,
  leadEvents,
  messages,
  products,
  settings,
  testimonials,
} from "@/admin/server/db/schema";

const DAY = 86_400_000;
const istDay = (column: unknown) => sql<string>`to_char((${column} at time zone 'Asia/Kolkata')::date, 'YYYY-MM-DD')`;

/** The last `days` calendar days in India time, oldest first, as yyyy-mm-dd. */
function lastDays(days: number) {
  const today = new Date(Date.now() + 5.5 * 3_600_000);
  return Array.from({ length: days }, (_, index) =>
    new Date(today.getTime() - (days - 1 - index) * DAY).toISOString().slice(0, 10),
  );
}

function fill(days: string[], rows: { day: string; total: number }[]): SeriesPoint[] {
  const byDay = new Map(rows.map((row) => [row.day, Number(row.total)]));
  return days.map((day) => ({ day, value: byDay.get(day) ?? 0 }));
}

export async function getDashboardData() {
  const db = await getDb();
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY);
  const since7 = new Date(now - 7 * DAY);
  const since14 = new Date(now - 14 * DAY);
  const days = lastDays(30);
  const notSpam = ne(enquiries.status, "spam");

  const [
    enquiriesByDay,
    clicksByDay,
    [enquiries7],
    [enquiriesPrev7],
    [unreadEnquiries],
    pipeline,
    byForm,
    clicksByType,
    topProducts,
    [unreadMessages],
    recentEnquiries,
    recentMessages,
    followUps,
    [catalogue],
    [liveSamples],
    recentActivity,
    storedSettings,
  ] = await Promise.all([
    db
      .select({ day: istDay(enquiries.createdAt), total: count() })
      .from(enquiries)
      .where(and(gte(enquiries.createdAt, since30), notSpam))
      .groupBy(sql`1`),
    db
      .select({ day: istDay(leadEvents.createdAt), total: count() })
      .from(leadEvents)
      .where(gte(leadEvents.createdAt, since30))
      .groupBy(sql`1`),
    db
      .select({ total: count() })
      .from(enquiries)
      .where(and(gte(enquiries.createdAt, since7), notSpam)),
    db
      .select({ total: count() })
      .from(enquiries)
      .where(and(gte(enquiries.createdAt, since14), sql`${enquiries.createdAt} < ${since7}`, notSpam)),
    db
      .select({ total: count() })
      .from(enquiries)
      .where(and(eq(enquiries.isRead, false), notSpam)),
    db.select({ status: enquiries.status, total: count() }).from(enquiries).groupBy(enquiries.status),
    db
      .select({ formKey: enquiries.formKey, formName: sql<string>`max(${enquiries.formName})`, total: count() })
      .from(enquiries)
      .where(and(gte(enquiries.createdAt, since30), notSpam))
      .groupBy(enquiries.formKey),
    db
      .select({ type: leadEvents.type, total: count() })
      .from(leadEvents)
      .where(gte(leadEvents.createdAt, since30))
      .groupBy(leadEvents.type),
    db
      .select({ slug: leadEvents.productSlug, total: count() })
      .from(leadEvents)
      .where(and(gte(leadEvents.createdAt, since30), ne(leadEvents.productSlug, "")))
      .groupBy(leadEvents.productSlug)
      .orderBy(desc(count()))
      .limit(5),
    db
      .select({ total: count() })
      .from(messages)
      .where(and(eq(messages.isRead, false), ne(messages.status, "spam"))),
    db.select().from(enquiries).where(notSpam).orderBy(desc(enquiries.createdAt)).limit(6),
    db
      .select({
        id: messages.id,
        channel: messages.channel,
        contactName: messages.contactName,
        contactPhone: messages.contactPhone,
        body: messages.body,
        isRead: messages.isRead,
        occurredAt: messages.occurredAt,
      })
      .from(messages)
      .where(and(eq(messages.direction, "inbound"), ne(messages.status, "spam")))
      .orderBy(desc(messages.occurredAt))
      .limit(5),
    db
      .select({
        id: enquiries.id,
        name: enquiries.name,
        formName: enquiries.formName,
        followUpAt: enquiries.followUpAt,
        productName: enquiries.productName,
      })
      .from(enquiries)
      .where(
        and(
          isNotNull(enquiries.followUpAt),
          lte(enquiries.followUpAt, new Date(now + DAY)),
          inArray(enquiries.status, ["new", "contacted", "quoted"]),
        ),
      )
      .orderBy(enquiries.followUpAt)
      .limit(6),
    db
      .select({
        published: sql<number>`count(*) filter (where ${products.isPublished})`.mapWith(Number),
        hidden: sql<number>`count(*) filter (where not ${products.isPublished})`.mapWith(Number),
        noPrice: sql<number>`count(*) filter (where ${products.isPublished} and ${products.price} is null)`.mapWith(
          Number,
        ),
        outOfStock:
          sql<number>`count(*) filter (where ${products.isPublished} and ${products.stockStatus} = 'out_of_stock')`.mapWith(
            Number,
          ),
        noImage: sql<number>`count(*) filter (where ${products.isPublished} and ${products.image} is null)`.mapWith(
          Number,
        ),
      })
      .from(products),
    db
      .select({ total: count() })
      .from(testimonials)
      .where(and(eq(testimonials.isSample, true), eq(testimonials.isPublished, true))),
    db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(8),
    db.select({ key: settings.key, value: settings.value }).from(settings),
  ]);

  const productNames = topProducts.length
    ? await db
        .select({ slug: products.slug, name: products.name, id: products.id })
        .from(products)
        .where(
          inArray(
            products.slug,
            topProducts.map((row) => row.slug),
          ),
        )
    : [];
  const nameBySlug = new Map(productNames.map((row) => [row.slug, row]));
  const [webhookMessages] = await db.select({ total: count() }).from(messages).where(eq(messages.source, "webhook"));

  return {
    days,
    enquirySeries: fill(days, enquiriesByDay),
    clickSeries: fill(days, clicksByDay),
    enquiries7: enquiries7.total,
    enquiriesPrev7: enquiriesPrev7.total,
    unreadEnquiries: unreadEnquiries.total,
    pipeline: new Map(pipeline.map((row) => [row.status, row.total])),
    byForm,
    clicksByType: new Map(clicksByType.map((row) => [row.type, row.total])),
    topProducts: topProducts.map((row) => ({
      ...row,
      name: nameBySlug.get(row.slug)?.name ?? row.slug,
      id: nameBySlug.get(row.slug)?.id,
    })),
    unreadMessages: unreadMessages.total,
    recentEnquiries,
    recentMessages,
    followUps: followUps.map((item) => ({
      ...item,
      overdue: Boolean(item.followUpAt && item.followUpAt.getTime() < now),
    })),
    catalogue,
    liveSamples: liveSamples.total,
    recentActivity,
    storedSettings: new Map(storedSettings.map((row) => [row.key, row.value])),
    hasWebhookMessages: webhookMessages.total > 0,
  };
}

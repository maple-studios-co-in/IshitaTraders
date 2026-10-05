import "server-only";

import { and, count, desc, eq, gt, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";

import { enquiryStatuses, type EnquiryStatus } from "@/admin/content/types";
import { getDb } from "@/admin/server/db/client";
import { enquiries, users } from "@/admin/server/db/schema";
import { likePattern } from "@/admin/server/query";

export type EnquiryRow = typeof enquiries.$inferSelect;

export interface EnquiryFilters {
  form?: string;
  status?: string;
  q?: string;
  unread?: boolean;
  /** yyyy-mm-dd, inclusive, India time. */
  from?: string;
  to?: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const istStart = (day: string) => new Date(`${day}T00:00:00+05:30`);

export function enquiryWhere(filters: EnquiryFilters, options: { ignoreForm?: boolean; ignoreStatus?: boolean } = {}) {
  const where: SQL[] = [];
  if (filters.form && !options.ignoreForm) where.push(eq(enquiries.formKey, filters.form));
  if (filters.status && !options.ignoreStatus && enquiryStatuses.includes(filters.status as EnquiryStatus)) {
    where.push(eq(enquiries.status, filters.status as EnquiryStatus));
  } else if (!options.ignoreStatus && !filters.status) {
    // Spam stays out of the way unless asked for.
    where.push(sql`${enquiries.status} <> 'spam'`);
  }
  if (filters.unread) where.push(eq(enquiries.isRead, false));
  if (filters.from && DATE.test(filters.from)) where.push(gte(enquiries.createdAt, istStart(filters.from)));
  if (filters.to && DATE.test(filters.to))
    where.push(lt(enquiries.createdAt, new Date(istStart(filters.to).getTime() + 86_400_000)));
  if (filters.q) {
    const pattern = likePattern(filters.q);
    where.push(
      or(
        ilike(enquiries.name, pattern),
        ilike(enquiries.email, pattern),
        ilike(enquiries.phone, pattern),
        ilike(enquiries.company, pattern),
        ilike(enquiries.message, pattern),
        ilike(enquiries.productName, pattern),
        sql`${enquiries.fields}::text ilike ${pattern}`,
      )!,
    );
  }
  return where.length ? and(...where) : undefined;
}

export async function listEnquiries(filters: EnquiryFilters, page = 1, pageSize = 25) {
  const db = await getDb();
  const where = enquiryWhere(filters);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(enquiries)
      .where(where)
      .orderBy(desc(enquiries.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(enquiries).where(where),
  ]);
  return { rows, total };
}

/** Totals per form (for the tabs) and per status (for the pipeline chips), under the other filters. */
export async function enquiryCounts(filters: EnquiryFilters) {
  const db = await getDb();
  const [byForm, byStatus] = await Promise.all([
    db
      .select({
        formKey: enquiries.formKey,
        formName: sql<string>`max(${enquiries.formName})`,
        total: count(),
        unread: sql<number>`count(*) filter (where not ${enquiries.isRead})`.mapWith(Number),
      })
      .from(enquiries)
      .where(enquiryWhere(filters, { ignoreForm: true }))
      .groupBy(enquiries.formKey),
    db
      .select({ status: enquiries.status, total: count() })
      .from(enquiries)
      .where(enquiryWhere(filters, { ignoreStatus: true }))
      .groupBy(enquiries.status),
  ]);
  return { byForm, byStatus: new Map(byStatus.map((row) => [row.status, row.total])) };
}

export async function getEnquiry(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  const [row] = await db.select().from(enquiries).where(eq(enquiries.id, id)).limit(1);
  return row ?? null;
}

/** The previous (older) and next (newer) enquiry of the same form. */
export async function enquiryNeighbours(row: EnquiryRow) {
  const db = await getDb();
  const [[older], [newer]] = await Promise.all([
    db
      .select({ id: enquiries.id })
      .from(enquiries)
      .where(and(eq(enquiries.formKey, row.formKey), lt(enquiries.createdAt, row.createdAt)))
      .orderBy(desc(enquiries.createdAt))
      .limit(1),
    db
      .select({ id: enquiries.id })
      .from(enquiries)
      .where(and(eq(enquiries.formKey, row.formKey), gt(enquiries.createdAt, row.createdAt)))
      .orderBy(enquiries.createdAt)
      .limit(1),
  ]);
  return { older: older?.id ?? null, newer: newer?.id ?? null };
}

/** Earlier enquiries from the same phone or email — repeat customers. */
export async function relatedEnquiries(row: EnquiryRow) {
  const conditions: SQL[] = [];
  if (row.phone) conditions.push(eq(enquiries.phone, row.phone));
  if (row.email) conditions.push(eq(enquiries.email, row.email));
  if (!conditions.length) return [];
  const db = await getDb();
  return db
    .select({
      id: enquiries.id,
      formName: enquiries.formName,
      status: enquiries.status,
      productName: enquiries.productName,
      createdAt: enquiries.createdAt,
    })
    .from(enquiries)
    .where(and(or(...conditions), sql`${enquiries.id} <> ${row.id}`))
    .orderBy(desc(enquiries.createdAt))
    .limit(6);
}

export async function listAssignees() {
  const db = await getDb();
  return db.select({ id: users.id, name: users.name }).from(users).where(eq(users.isActive, true)).orderBy(users.name);
}

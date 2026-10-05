import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { PageStatus } from "@/admin/content/types";
import { getDb } from "@/admin/server/db/client";
import { pages, pageVersions, redirects, users } from "@/admin/server/db/schema";

/** `%term%` for ILIKE, with the wildcard characters in the term escaped. */
const contains = (term: string) => `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

export interface PageListFilters {
  q: string;
  status: PageStatus | "";
  page: number;
  pageSize: number;
}

export async function listPages({ q, status, page, pageSize }: PageListFilters) {
  const db = await getDb();
  const conditions: SQL[] = [];
  if (q) {
    const pattern = contains(q);
    conditions.push(or(ilike(pages.title, pattern), ilike(pages.slug, pattern), ilike(pages.description, pattern))!);
  }
  const searchOnly = conditions.length ? and(...conditions) : undefined;
  if (status) conditions.push(eq(pages.status, status));
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }], byStatus] = await Promise.all([
    db
      .select({
        id: pages.id,
        slug: pages.slug,
        title: pages.title,
        description: pages.description,
        status: pages.status,
        noindex: pages.noindex,
        viewCount: pages.viewCount,
        publishedAt: pages.publishedAt,
        updatedAt: pages.updatedAt,
        bytes: sql<number>`octet_length(${pages.html})`.mapWith(Number),
      })
      .from(pages)
      .where(where)
      .orderBy(desc(pages.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(pages).where(where),
    db.select({ status: pages.status, total: count() }).from(pages).where(searchOnly).groupBy(pages.status),
  ]);

  const counts = { all: 0, published: 0, draft: 0 };
  for (const row of byStatus) {
    counts[row.status] = row.total;
    counts.all += row.total;
  }
  return { rows, total, counts };
}

export type PageListRow = Awaited<ReturnType<typeof listPages>>["rows"][number];

const creators = alias(users, "page_creator");
const updaters = alias(users, "page_updater");

/** A page with everything the editor shows (document, authors, versions). */
export async function getPageForEditing(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      page: pages,
      createdByName: creators.name,
      updatedByName: updaters.name,
    })
    .from(pages)
    .leftJoin(creators, eq(creators.id, pages.createdBy))
    .leftJoin(updaters, eq(updaters.id, pages.updatedBy))
    .where(eq(pages.id, id))
    .limit(1);
  if (!row) return null;

  const versions = await db
    .select({
      id: pageVersions.id,
      title: pageVersions.title,
      note: pageVersions.note,
      createdAt: pageVersions.createdAt,
      authorName: users.name,
      bytes: sql<number>`octet_length(${pageVersions.html})`.mapWith(Number),
    })
    .from(pageVersions)
    .leftJoin(users, eq(users.id, pageVersions.createdBy))
    .where(eq(pageVersions.pageId, id))
    .orderBy(desc(pageVersions.createdAt), desc(pageVersions.id));

  return { ...row.page, createdByName: row.createdByName, updatedByName: row.updatedByName, versions };
}

/** The document to preview: the page's current HTML, or one of its saved versions. */
export async function getPreviewDocument(pageId: string, versionId?: string) {
  const db = await getDb();
  if (versionId) {
    const [version] = await db
      .select({ html: pageVersions.html })
      .from(pageVersions)
      .where(and(eq(pageVersions.id, versionId), eq(pageVersions.pageId, pageId)))
      .limit(1);
    return version?.html ?? null;
  }
  const [page] = await db.select({ html: pages.html }).from(pages).where(eq(pages.id, pageId)).limit(1);
  return page?.html ?? null;
}

/** The page using a slug (any status), if any. */
export async function findPageBySlug(slug: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: pages.id, title: pages.title, status: pages.status })
    .from(pages)
    .where(eq(pages.slug, slug))
    .limit(1);
  return row ?? null;
}

/** The active redirect starting at `/slug`, if any (it would be hidden by a page at that address). */
export async function findRedirectFrom(path: string) {
  const db = await getDb();
  const [row] = await db
    .select({ id: redirects.id, destination: redirects.destination })
    .from(redirects)
    .where(and(eq(redirects.source, path), eq(redirects.isActive, true)))
    .limit(1);
  return row ?? null;
}

/** All slugs, for suggesting a free one ("diwali-offer-2"). */
export async function listSlugs() {
  const db = await getDb();
  const rows = await db.select({ slug: pages.slug }).from(pages).orderBy(asc(pages.slug));
  return new Set(rows.map((row) => row.slug));
}

import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { cacheTags } from "@/admin/server/cache";
import { getDb } from "@/admin/server/db/client";
import { faqs, pages, redirects, testimonials } from "@/admin/server/db/schema";
import { seedFaqs, seedTestimonials } from "@/admin/server/db/seed/content";

import { reportContentFallback } from "./fallback";
import type { PublicFaq, PublicTestimonial } from "./public-types";

/* ----------------------------------------------------------- testimonials */

const loadTestimonials = unstable_cache(
  async (): Promise<PublicTestimonial[]> => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.isPublished, true))
      .orderBy(asc(testimonials.sortOrder), asc(testimonials.createdAt));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      location: row.location,
      quote: row.quote,
      rating: row.rating,
      badge: { kind: row.badgeKind, label: row.badgeLabel },
      avatar: row.avatar,
      isSample: row.isSample,
    }));
  },
  ["testimonials:v1"],
  { tags: [cacheTags.testimonials], revalidate: 3600 },
);

export const getTestimonials = cache(async (): Promise<PublicTestimonial[]> => {
  try {
    return await loadTestimonials();
  } catch (error) {
    reportContentFallback("testimonials", error);
    return seedTestimonials.map((item, index) => ({
      id: `seed:${index}`,
      name: item.name,
      location: item.location,
      quote: item.quote,
      rating: item.rating,
      badge: { kind: item.badgeKind, label: item.badgeLabel },
      avatar: item.avatar,
      isSample: item.isSample,
    }));
  }
});

/* -------------------------------------------------------------------- FAQ */

const loadFaqs = unstable_cache(
  async (): Promise<PublicFaq[]> => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(faqs)
      .where(eq(faqs.isPublished, true))
      .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
    return rows.map((row) => ({ id: row.id, question: row.question, answer: row.answer }));
  },
  ["faqs:v1"],
  { tags: [cacheTags.faqs], revalidate: 3600 },
);

export const getFaqs = cache(async (): Promise<PublicFaq[]> => {
  try {
    return await loadFaqs();
  } catch (error) {
    reportContentFallback("faqs", error);
    return seedFaqs.map((item, index) => ({ id: `seed:${index}`, ...item }));
  }
});

/* ----------------------------------------------------- pages & redirects */

export interface RoutingTable {
  pages: { id: string; slug: string; noindex: boolean; updatedAt: string }[];
  redirects: { id: string; source: string; destination: string; statusCode: number }[];
}

const loadRoutingTable = unstable_cache(
  async (): Promise<RoutingTable> => {
    const db = await getDb();
    const [pageRows, redirectRows] = await Promise.all([
      db
        .select({ id: pages.id, slug: pages.slug, noindex: pages.noindex, updatedAt: pages.updatedAt })
        .from(pages)
        .where(eq(pages.status, "published")),
      db
        .select({
          id: redirects.id,
          source: redirects.source,
          destination: redirects.destination,
          statusCode: redirects.statusCode,
        })
        .from(redirects)
        .where(eq(redirects.isActive, true)),
    ]);
    return {
      pages: pageRows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() })),
      redirects: redirectRows,
    };
  },
  ["routing:v1"],
  { tags: [cacheTags.pages, cacheTags.redirects], revalidate: 3600 },
);

/** Published HTML pages and active redirects — the lookup table for unknown URLs and the sitemap. */
export const getRoutingTable = cache(async (): Promise<RoutingTable> => {
  try {
    return await loadRoutingTable();
  } catch (error) {
    reportContentFallback("routing", error);
    return { pages: [], redirects: [] };
  }
});

/** One published page's document, cached until the page is edited. */
export function getPublishedPage(id: string) {
  return unstable_cache(
    async () => {
      const db = await getDb();
      const [row] = await db
        .select({
          id: pages.id,
          slug: pages.slug,
          title: pages.title,
          html: pages.html,
          noindex: pages.noindex,
          updatedAt: pages.updatedAt,
        })
        .from(pages)
        .where(and(eq(pages.id, id), eq(pages.status, "published")))
        .limit(1);
      return row ? { ...row, updatedAt: row.updatedAt.toISOString() } : null;
    },
    ["page:v1", id],
    { tags: [cacheTags.pages], revalidate: 3600 },
  )();
}

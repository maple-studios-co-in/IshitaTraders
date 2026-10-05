import "server-only";

import { eq, sql } from "drizzle-orm";
import { after, type NextRequest } from "next/server";

import { getPublishedPage, getRoutingTable } from "@/admin/content/content";
import { getSiteSettings } from "@/admin/content/settings";
import { htmlDocumentResponse, PUBLIC_PAGE_CACHE } from "@/admin/features/pages/serve";
import { normalizePath } from "@/admin/lib/paths";
import { getDb } from "@/admin/server/db/client";
import { pages, redirects } from "@/admin/server/db/schema";

import { notFoundResponse } from "./not-found-response";

const REDIRECT_CODES = new Set([301, 302, 307, 308]);

/** Crawlers, link unfurlers, monitors and scripts: not counted as page views. */
const NON_HUMAN_AGENT =
  /bot|crawl|spider|slurp|scrap|preview|monitor|lighthouse|pagespeed|headless|phantom|puppeteer|playwright|curl|wget|python|java\/|okhttp|httpclient|axios|node-fetch|undici|go-http|ruby|php\/|facebookexternalhit|whatsapp|telegram|discord|slack|skype|embedly|vercel/i;

/**
 * Everything the app's own routes don't handle: an uploaded HTML page at `/<slug>`, then an
 * admin-managed redirect, then the branded 404. Lookups use the cached routing table, so unknown
 * URLs cost no database query.
 */
export async function servePath(request: NextRequest): Promise<Response> {
  const { pathname, search } = request.nextUrl;
  const key = normalizePath(pathname);
  const routing = await getRoutingTable();

  const slug = key.slice(1);
  if (slug && !slug.includes("/")) {
    const entry = routing.pages.find((page) => page.slug === slug);
    if (entry) {
      // One canonical address per page: /Diwali-Offer → /diwali-offer.
      if (pathname !== `/${entry.slug}`) return redirectResponse(`/${entry.slug}${search}`, 308);
      const page = await getPublishedPage(entry.id);
      if (page) {
        const { seo } = await getSiteSettings();
        if (request.method === "GET" && isHumanPageView(request)) after(() => recordView(page.id));
        return htmlDocumentResponse(page.html, {
          noindex: page.noindex || !seo.allowIndexing,
          cacheControl: PUBLIC_PAGE_CACHE,
          method: request.method,
          lastModified: page.updatedAt,
        });
      }
    }
  }

  const redirect = routing.redirects.find((item) => normalizePath(item.source) === key);
  if (redirect) {
    if (request.method === "GET") after(() => recordHit(redirect.id));
    return redirectResponse(
      resolveDestination(redirect.destination, search),
      REDIRECT_CODES.has(redirect.statusCode) ? redirect.statusCode : 301,
    );
  }

  return notFoundResponse(request);
}

/**
 * Redirects aren't cached by browsers or the CDN (`no-store`): an edited or removed redirect takes
 * effect at once, and every visit is counted. 301/308 still tell search engines the move is permanent.
 */
function redirectResponse(location: string, status: number) {
  return new Response(null, { status, headers: { Location: location, "Cache-Control": "no-store" } });
}

/** The redirect target, keeping the visitor's query string (e.g. UTM tags) unless the target has its own. */
function resolveDestination(destination: string, search: string) {
  const absolute = /^https?:\/\//i.test(destination);
  let url: URL;
  try {
    url = new URL(destination, "http://site.invalid");
  } catch {
    return "/";
  }
  if (search && !url.search) url.search = search;
  return absolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
}

function isHumanPageView(request: NextRequest) {
  const h = request.headers;
  const agent = h.get("user-agent") ?? "";
  if (!agent || NON_HUMAN_AGENT.test(agent)) return false;
  // Speculative prefetches aren't visits.
  const purpose = `${h.get("sec-purpose") ?? ""} ${h.get("purpose") ?? ""} ${h.get("x-moz") ?? ""}`;
  return !/prefetch|prerender/i.test(purpose);
}

// Counters only: `updated_at` is kept as-is so a visit doesn't look like an edit (sitemap lastmod).
async function recordView(id: string) {
  try {
    const db = await getDb();
    await db
      .update(pages)
      .set({ viewCount: sql`${pages.viewCount} + 1`, updatedAt: sql`${pages.updatedAt}` })
      .where(eq(pages.id, id));
  } catch (error) {
    console.error("[pages] Couldn’t count a page view", error);
  }
}

async function recordHit(id: string) {
  try {
    const db = await getDb();
    await db
      .update(redirects)
      .set({ hitCount: sql`${redirects.hitCount} + 1`, lastHitAt: new Date(), updatedAt: sql`${redirects.updatedAt}` })
      .where(eq(redirects.id, id));
  } catch (error) {
    console.error("[redirects] Couldn’t count a redirect hit", error);
  }
}

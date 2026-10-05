import "server-only";

import type { PageStatus } from "@/admin/content/types";
import { normalizePath } from "@/admin/lib/paths";
import { getDb } from "@/admin/server/db/client";
import { pages, redirects } from "@/admin/server/db/schema";
import { siteConfig } from "@/config/site";

import { checkDestination, checkSource, findLoop } from "./rules";

export interface RedirectContext {
  redirects: { id: string; source: string; destination: string; isActive: boolean }[];
  pages: { slug: string; title: string; status: PageStatus }[];
}

/** Everything a new or changed redirect is checked against. */
export async function loadRedirectContext(): Promise<RedirectContext> {
  const db = await getDb();
  const [redirectRows, pageRows] = await Promise.all([
    db
      .select({
        id: redirects.id,
        source: redirects.source,
        destination: redirects.destination,
        isActive: redirects.isActive,
      })
      .from(redirects),
    db.select({ slug: pages.slug, title: pages.title, status: pages.status }).from(pages),
  ]);
  return { redirects: redirectRows, pages: pageRows };
}

/** Hosts that mean "this website" in a full-link destination (with and without www). */
export function siteHosts(): string[] {
  const bare = new URL(siteConfig.url).host.toLowerCase().replace(/^www\./, "");
  return [bare, `www.${bare}`];
}

const internalPathOf = (destination: string, hosts: string[]) => {
  const checked = checkDestination(destination, hosts);
  return checked.ok ? checked.value.internalPath : null;
};

export type RedirectCheck =
  | { ok: true; source: string; destination: string }
  | { ok: false; errors: Partial<Record<"source" | "destination", string>> };

/**
 * Full validation of one redirect: well-formed source and destination, the source isn't the
 * website's own route, another redirect or an HTML page, and it doesn't point to itself or start a loop.
 */
export function validateRedirect(
  input: { source: string; destination: string; isActive: boolean },
  context: RedirectContext,
  editingId?: string,
): RedirectCheck {
  const hosts = siteHosts();
  const errors: Partial<Record<"source" | "destination", string>> = {};
  const source = checkSource(input.source);
  const destination = checkDestination(input.destination, hosts);
  if (!source.ok) errors.source = source.error;
  if (!destination.ok) errors.destination = destination.error;
  if (!source.ok || !destination.ok) return { ok: false, errors };

  const path = source.value;
  const others = context.redirects.filter((item) => item.id !== editingId);
  const duplicate = others.find((item) => normalizePath(item.source) === path);
  const segment = path.slice(1);
  const page = segment.includes("/") ? undefined : context.pages.find((item) => item.slug === segment);

  if (duplicate) {
    errors.source = `There’s already a redirect from ${path} (to ${duplicate.destination}) — edit that one instead.`;
  } else if (page) {
    errors.source = `The HTML page “${page.title}”${page.status === "draft" ? " (a draft)" : ""} uses ${path}, and a page always wins over a redirect. Change the page’s address first, or pick another.`;
  } else if (destination.value.internalPath === path) {
    errors.destination = "A redirect can’t point to itself.";
  } else if (input.isActive) {
    const next = new Map(
      others
        .filter((item) => item.isActive)
        .map((item) => [normalizePath(item.source), internalPathOf(item.destination, hosts)]),
    );
    const loop = findLoop(path, destination.value.internalPath, next);
    if (loop) errors.destination = `This would send visitors round in a circle: ${loop.join(" → ")}.`;
  }

  if (errors.source || errors.destination) return { ok: false, errors };
  return { ok: true, source: path, destination: destination.value.value };
}

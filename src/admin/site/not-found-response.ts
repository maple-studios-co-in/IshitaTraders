import "server-only";

import type { NextRequest } from "next/server";

import { contactLinks } from "@/admin/content/links";
import { getSiteSettings } from "@/admin/content/settings";
import { env } from "@/admin/server/env";

/**
 * The website's branded 404 for URLs that reach the catch-all route.
 *
 * In this Next.js version `notFound()` inside a Route Handler answers with an empty 404 (it never
 * renders `app/not-found.tsx`), and with a catch-all route no URL is "unmatched" any more, so
 * Next.js never renders its 404 page by itself. Instead `app/not-found-document/page.tsx` calls
 * `notFound()` — rendering `app/not-found.tsx` in the root layout with a 404 status — and that
 * document is fetched and reused (per server instance, refreshed every few minutes; fresh on every
 * request in development). If that ever fails, a small self-contained page with the same message
 * is used instead.
 */

/** The page that renders the branded 404 document (see `app/not-found-document/page.tsx`). */
const NOT_FOUND_DOCUMENT_PATH = "/not-found-document";

const INTERNAL_REQUEST_HEADER = "x-site-not-found-document";
const FALLBACK_MARKER_HEADER = "x-site-not-found-fallback";
const TTL_MS = 10 * 60 * 1000;
const FAILURE_TTL_MS = 60 * 1000;

/** `Sec-Fetch-Dest` values for subresources that can never show an HTML page (same list Next.js uses). */
const NON_HTML_DESTINATIONS = new Set([
  "audio",
  "audioworklet",
  "font",
  "image",
  "json",
  "manifest",
  "paintworklet",
  "report",
  "script",
  "serviceworker",
  "sharedworker",
  "style",
  "track",
  "video",
  "webidentity",
  "worker",
  "xslt",
]);

let cached: { origin: string; html: string | null; expires: number } | null = null;
let inflight: Promise<string | null> | null = null;

export async function notFoundResponse(request: NextRequest): Promise<Response> {
  const headers = new Headers({ "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  const head = request.method === "HEAD";
  const { pathname, origin } = request.nextUrl;

  const destination = request.headers.get("sec-fetch-dest");
  if (destination && NON_HTML_DESTINATIONS.has(destination)) {
    headers.set("Content-Type", "text/plain; charset=utf-8");
    return new Response(head ? null : "Not Found", { status: 404, headers });
  }
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    headers.set("Content-Type", "application/json");
    return new Response(head ? null : JSON.stringify({ error: "Not found" }), { status: 404, headers });
  }

  headers.set("Content-Type", "text/html; charset=utf-8");
  if (head) return new Response(null, { status: 404, headers });

  // Never fetch from inside the fetch: if that request ever lands here, it gets the fallback, which
  // the loader recognises and rejects (no loops).
  const internal = request.headers.has(INTERNAL_REQUEST_HEADER) || pathname === NOT_FOUND_DOCUMENT_PATH;
  const html = internal ? null : await loadNotFoundDocument(origin);
  if (html) return new Response(html, { status: 404, headers });

  headers.set(FALLBACK_MARKER_HEADER, "1");
  return new Response(await fallbackDocument(), { status: 404, headers });
}

async function loadNotFoundDocument(origin: string): Promise<string | null> {
  if (cached && cached.origin === origin && cached.expires > Date.now()) return cached.html;
  inflight ??= fetchNotFoundDocument(origin)
    .then((html) => {
      if (env.isProduction) cached = { origin, html, expires: Date.now() + (html ? TTL_MS : FAILURE_TTL_MS) };
      return html;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function fetchNotFoundDocument(origin: string): Promise<string | null> {
  try {
    const response = await fetch(new URL(NOT_FOUND_DOCUMENT_PATH, origin), {
      headers: { [INTERNAL_REQUEST_HEADER]: "1", accept: "text/html" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    const usable =
      response.status === 404 &&
      !response.headers.has(FALLBACK_MARKER_HEADER) &&
      (response.headers.get("content-type") ?? "").includes("text/html");
    if (!usable) {
      await response.body?.cancel();
      return null;
    }
    const html = await response.text();
    return /<html[\s>]/i.test(html) ? html : null;
  } catch (error) {
    console.warn(
      "[site] Couldn’t load the 404 page, using the fallback:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
  );

/** Self-contained version of `app/not-found.tsx` (same message and actions, inline styles). */
async function fallbackDocument() {
  const { business, contact } = await getSiteSettings();
  const name = escapeHtml(business.name);
  const whatsapp = escapeHtml(contactLinks(contact).whatsapp());
  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page not found · ${name}</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;background:linear-gradient(180deg,#eef3fc 0%,#fff 70%);color:#0f2a5c;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:36rem}
.brand{font-weight:800;font-size:20px;letter-spacing:-.01em}
.eyebrow{margin:24px 0 0;font-size:14px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3d8b2f}
h1{margin:12px 0;font-size:clamp(32px,7vw,48px);line-height:1.1;font-weight:800;letter-spacing:-.02em}
p.lead{margin:0 auto 28px;max-width:28rem;color:#475569;line-height:1.6}
nav{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
a{display:inline-flex;align-items:center;min-height:48px;padding:0 24px;border-radius:999px;font-weight:600;text-decoration:none}
a.primary{background:#1e3a8a;color:#fff}
a.secondary{border:1.5px solid #1e3a8a;color:#1e3a8a}
a:focus-visible{outline:3px solid #3b82f6;outline-offset:3px}
</style>
</head>
<body>
<main>
<div class="brand">${name}</div>
<p class="eyebrow">404 — Page not found</p>
<h1>This page has switched off.</h1>
<p class="lead">The page you are looking for doesn’t exist or has moved.</p>
<nav aria-label="Where to next">
<a class="primary" href="/">Back to home</a>
<a class="secondary" href="/products">Browse products</a>
<a class="secondary" href="${whatsapp}">WhatsApp us</a>
</nav>
</main>
</body>
</html>`;
}

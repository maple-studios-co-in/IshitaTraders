import "server-only";

/**
 * Uploaded pages run in a sandbox with an opaque origin (no `allow-same-origin`): their scripts,
 * forms and popups work, but they can never read this site's cookies or storage, call its APIs
 * with the visitor's credentials, or act on an admin session.
 */
export const PAGE_SANDBOX_CSP = [
  "sandbox",
  "allow-scripts",
  "allow-forms",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-modals",
  "allow-downloads",
  "allow-top-navigation-by-user-activation",
].join(" ");

/** Public pages: CDN-cached for 5 minutes, then served stale while refreshing in the background. */
export const PUBLIC_PAGE_CACHE = "public, s-maxage=300, stale-while-revalidate=86400";

interface HtmlDocumentOptions {
  noindex: boolean;
  cacheControl: string;
  /** HEAD requests get the headers only. */
  method?: string;
  lastModified?: string | Date;
}

/** An uploaded HTML document, served as-is inside the sandbox. */
export function htmlDocumentResponse(
  html: string,
  { noindex, cacheControl, method, lastModified }: HtmlDocumentOptions,
) {
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy": PAGE_SANDBOX_CSP,
    "Cache-Control": cacheControl,
  });
  if (noindex) headers.set("X-Robots-Tag", "noindex");
  if (lastModified) headers.set("Last-Modified", new Date(lastModified).toUTCString());
  return new Response(method === "HEAD" ? null : html, { status: 200, headers });
}

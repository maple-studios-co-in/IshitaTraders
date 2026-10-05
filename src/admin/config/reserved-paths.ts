/**
 * Addresses that belong to the website itself. An uploaded HTML page can't use them as its slug,
 * and a redirect can't start at them (the app route would always answer first, so the redirect
 * would never run).
 *
 * Page slugs are a single path segment (`/diwali-offer`); redirect sources may be deeper
 * (`/old/brochure`) and are refused when their *first* segment is listed here.
 *
 * Keep this in sync with `src/app`: add the first segment of every new top-level route.
 */
const reserved = [
  // Routes of this app
  "admin",
  "api",
  "media",
  "products",
  "not-found-document",
  // Framework internals and metadata files (`src/app/*.ts`, `public/`)
  "_next",
  "_not-found",
  "_error",
  "static",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.webmanifest",
  "manifest.json",
  "icon.png",
  "apple-icon.png",
  "og.jpg",
  ".well-known",
  // Plain words people would expect to be the website's own pages
  "sitemap",
  "robots",
  "manifest",
  "favicon",
  "icon",
  "apple-icon",
  "opengraph-image",
  "twitter-image",
  "assets",
  "public",
  "images",
  "fonts",
  "login",
  "logout",
  "signin",
  "sign-in",
  "signout",
  "sign-out",
  "signup",
  "sign-up",
  "register",
  "account",
  "dashboard",
  "auth",
  "search",
  "cart",
  "checkout",
  "404",
  "500",
] as const;

export const RESERVED_SLUGS: ReadonlySet<string> = new Set(reserved);

/** Public website routes that always exist (they're in the sitemap; nothing may shadow them). */
export const SITE_ROUTES = ["/", "/products"] as const;

/**
 * Whether a page slug is taken by the website. Slugs starting with "admin" are refused too:
 * robots.txt tells search engines to skip everything under `/admin`.
 */
export function isReservedSlug(slug: string) {
  const value = slug.trim().toLowerCase();
  return RESERVED_SLUGS.has(value) || value.startsWith("admin");
}

/**
 * Why a request path can't be used as a redirect source, or `null` when it can. Expects a path
 * that starts with "/" (see `normalizePath`).
 */
export function reservedPathReason(path: string): string | null {
  if (path === "/" || path === "") return "That’s the home page — it can’t be redirected.";
  const first = path.split("/")[1]?.toLowerCase() ?? "";
  if (RESERVED_SLUGS.has(first)) {
    return `Addresses under /${first} belong to the website itself, so a redirect there would never run.`;
  }
  return null;
}

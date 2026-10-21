/**
 * Image and file references stored by the website's admin (see the site's
 * src/admin/content/images.ts), turned into what an API client can use.
 */
import { env } from "../config/env.js";

/** Uploaded media live on the website (/media/…): make their paths full URLs when the site is known. */
export function absoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || !env.PUBLIC_SITE_URL) return path;
  return new URL(path, env.PUBLIC_SITE_URL).toString();
}

/**
 * Two kinds of image reference:
 * - "media": uploaded in the admin, with a real URL;
 * - "static": bundled into the website's build, so it has no address outside the site (url: null,
 *   `key` names the picture).
 */
export function image(ref) {
  if (!ref) return null;
  if (ref.kind === "media") {
    return { url: absoluteUrl(ref.url), alt: ref.alt ?? "", width: ref.width ?? null, height: ref.height ?? null };
  }
  return { url: null, key: ref.key ?? null, alt: ref.alt ?? "" };
}

/** A downloadable file (e.g. a product datasheet PDF). */
export function file(ref) {
  if (!ref) return null;
  return { url: absoluteUrl(ref.url), name: ref.name ?? "", size: ref.size ?? null };
}

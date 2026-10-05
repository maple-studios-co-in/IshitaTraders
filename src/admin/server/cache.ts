import "server-only";

import { revalidateTag, updateTag } from "next/cache";

/**
 * Cache tags for everything the public site reads from the database. Pages stay static (fast,
 * CDN-cached) and are rebuilt the moment the admin changes their data.
 */
export const cacheTags = {
  settings: "content:settings",
  catalog: "content:catalog",
  testimonials: "content:testimonials",
  faqs: "content:faqs",
  pages: "content:pages",
  redirects: "content:redirects",
} as const;

export type CacheTag = (typeof cacheTags)[keyof typeof cacheTags];

/** From a Server Action: expire now, so the admin sees their change on the next request. */
export function refreshContent(...tags: CacheTag[]) {
  for (const tag of tags) updateTag(tag);
}

/** From a Route Handler (webhooks, API): expire now. */
export function expireContent(...tags: CacheTag[]) {
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
}

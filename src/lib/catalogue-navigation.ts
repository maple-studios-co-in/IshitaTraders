import type { MouseEvent } from "react";

import { scrollToId } from "@/lib/smooth-scroll";

/** Event the open catalogue listens for; its detail is the new query string ("?brand=…"). */
export const CATALOGUE_NAVIGATE_EVENT = "catalogue:navigate";

/**
 * Catalogue links (`/products?brand=…`) clicked while the catalogue is already open: the filters
 * only read the address on load, so hand the new query to the catalogue instead of navigating —
 * with a history entry for Back, and the grid scrolled into view. Returns false when the click
 * should go ahead as a normal navigation (other pages, new-tab clicks).
 */
export function applyInOpenCatalogue(event: MouseEvent<HTMLAnchorElement>, href: string) {
  const url = new URL(href, window.location.href);
  if (
    url.pathname !== window.location.pathname ||
    !document.getElementById("catalogue-filters") ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }
  event.preventDefault();
  if (url.search !== window.location.search) window.history.pushState(null, "", `${url.pathname}${url.search}`);
  window.dispatchEvent(new CustomEvent(CATALOGUE_NAVIGATE_EVENT, { detail: url.search }));
  scrollToId("catalogue-filters");
  return true;
}

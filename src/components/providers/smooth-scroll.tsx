"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { scrollToId, setSmoothScroll } from "@/lib/smooth-scroll";

/**
 * Inertia scrolling for wheel/trackpad (touch keeps native scrolling) plus
 * header-aware handling for in-page anchor links. Disabled for reduced motion.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduceMotion ? null : new Lenis({ lerp: 0.12, wheelMultiplier: 1, autoRaf: true });
    setSmoothScroll(lenis);

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      const id = decodeURIComponent(link.getAttribute("href")!.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      scrollToId(id);
      // Move keyboard focus for targets that opt in (e.g. the skip link's <main tabIndex={-1}>).
      if (target.hasAttribute("tabindex")) target.focus({ preventScroll: true });
      history.replaceState(null, "", id === "top" ? window.location.pathname : `#${id}`);
    };

    document.addEventListener("click", onClick);

    // Honour a hash in the URL on first load once layout has settled.
    const initialId = window.location.hash.slice(1);
    const initialScroll = initialId
      ? window.setTimeout(() => scrollToId(decodeURIComponent(initialId)), 60)
      : undefined;

    return () => {
      document.removeEventListener("click", onClick);
      window.clearTimeout(initialScroll);
      lenis?.destroy();
      setSmoothScroll(null);
    };
  }, []);

  return null;
}

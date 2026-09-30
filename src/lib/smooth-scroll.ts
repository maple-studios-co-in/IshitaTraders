import type Lenis from "lenis";

/** Shared handle to the page's Lenis instance (null until mounted or when reduced motion is on). */
let instance: Lenis | null = null;

export function setSmoothScroll(lenis: Lenis | null) {
  instance = lenis;
}

export function getSmoothScroll() {
  return instance;
}

/**
 * Scrolls to an in-page section. The sticky-header gap comes from each target's CSS
 * `scroll-margin-top` (see globals.css), which both Lenis and scrollIntoView honour.
 */
export function scrollToId(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  if (instance) {
    instance.scrollTo(id === "top" ? 0 : target, { duration: 1.1 });
    return;
  }
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  if (id === "top") window.scrollTo({ top: 0, behavior });
  else target.scrollIntoView({ behavior, block: "start" });
}

export function lockScroll(locked: boolean) {
  document.documentElement.style.overflow = locked ? "hidden" : "";
  if (locked) instance?.stop();
  else instance?.start();
}

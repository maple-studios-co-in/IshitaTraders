"use client";

import { useEffect, useState } from "react";

/** Fraction of the viewport height used as the "reading line". */
const PROBE = 0.45;

/**
 * Tracks which of the given sections the visitor is currently reading: the last one
 * (in document order) whose top has scrolled above the reading line. Sections that
 * are not in the list simply keep the previous nav item active.
 */
export function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const update = () => {
      const line = window.innerHeight * PROBE;
      let current: HTMLElement | undefined;
      for (const el of elements) {
        const top = el.getBoundingClientRect().top;
        if (top <= line && (!current || top > current.getBoundingClientRect().top)) current = el;
      }
      if (current) setActive(current.id);
    };

    // Fires whenever a tracked section crosses the reading line — no scroll listener needed.
    const observer = new IntersectionObserver(update, {
      rootMargin: `-${PROBE * 100}% 0px -${100 - PROBE * 100 - 1}% 0px`,
    });
    elements.forEach((el) => observer.observe(el));
    update();
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

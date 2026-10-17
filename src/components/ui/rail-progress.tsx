"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

/**
 * Slim progress line for the swipe rail rendered right before it (phones only — see the
 * `mobile-rail` utility). Hidden whenever the rail fits without scrolling.
 */
export function RailProgress({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    const rail = bar?.previousElementSibling;
    if (!bar || !(rail instanceof HTMLElement)) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = rail.scrollWidth - rail.clientWidth;
      const size = rail.scrollWidth > 0 ? Math.min(1, rail.clientWidth / rail.scrollWidth) : 1;
      bar.style.setProperty("--rail-size", size.toFixed(4));
      bar.style.setProperty("--rail-pos", (max > 0 ? rail.scrollLeft / max : 0).toFixed(4));
      bar.toggleAttribute("data-static", max <= 1);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    rail.addEventListener("scroll", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(rail);
    return () => {
      rail.removeEventListener("scroll", schedule);
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "relative mx-auto mt-3 h-[3px] w-24 overflow-hidden rounded-full data-static:hidden md:hidden",
        tone === "dark" ? "bg-navy-900/10" : "bg-white/20",
        className,
      )}
    >
      <span
        className={cn("absolute inset-y-0 left-0 rounded-full", tone === "dark" ? "bg-navy-800" : "bg-white")}
        style={{
          width: "calc(var(--rail-size, 0.3) * 100%)",
          translate: "calc(var(--rail-pos, 0) * (1 / var(--rail-size, 0.3) - 1) * 100%) 0",
        }}
      />
    </div>
  );
}

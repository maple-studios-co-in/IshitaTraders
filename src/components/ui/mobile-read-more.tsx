"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * On phones, long copy opens on its first lines with a soft fade and a "Read more" toggle;
 * tablets and desktops always show everything. The text stays in the page either way.
 */
export function MobileReadMore({
  children,
  className,
  collapsedHeight = "12rem",
  fade = "#ffffff",
  label = "Read more",
}: {
  children: ReactNode;
  className?: string;
  /** Height shown on phones before "Read more". */
  collapsedHeight?: string;
  /** Background colour the fade blends into. */
  fade?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={className}>
      <div
        id={id}
        className={cn("relative", !open && "max-md:max-h-(--collapsed) max-md:overflow-hidden")}
        style={{ "--collapsed": collapsedHeight } as CSSProperties}
      >
        {children}
        {!open ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 md:hidden"
            style={{ background: `linear-gradient(to top, ${fade} 12%, transparent)` }}
          />
        ) : null}
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border border-navy-900/15 px-5 font-display text-sm font-bold text-navy-900 transition-colors active:bg-navy-900/5 md:hidden"
      >
        {open ? "Show less" : label}
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          className={cn("size-3 transition-transform duration-300", open && "rotate-180")}
        >
          <path d="M2 4.5 6 8.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

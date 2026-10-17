"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { ArrowRightIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { pageLinks, quoteHref, sectionIds } from "@/config/navigation";

/**
 * Phones: a frosted action dock — call, WhatsApp, get a quote — that rises once the visitor is past
 * the first screen (on the homepage: once the page has slid over the hero film). It steps aside
 * while the contact form or the footer is on screen, and while a form field is focused.
 */
export function MobileDock({
  phoneHref,
  phoneDisplay,
  whatsappHref,
}: {
  phoneHref: string;
  phoneDisplay: string;
  whatsappHref: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const quote = quoteHref(pathname === "/" || pathname === pageLinks.contact);

  useEffect(() => {
    const dock = ref.current;
    if (!dock) return;
    const cover = document.querySelector("[data-hero-cover]");
    // Places that carry their own contact actions.
    const quiet = [document.getElementById(sectionIds.contact), document.querySelector("footer")].filter(
      (el): el is HTMLElement => el !== null,
    );
    const inView = new Set<Element>();
    let typing = false;
    let raf = 0;

    const update = () => {
      raf = 0;
      const threshold = window.innerHeight * 0.6;
      const past = cover ? cover.getBoundingClientRect().top < threshold : window.scrollY > threshold;
      dock.toggleAttribute("data-visible", past && inView.size === 0 && !typing);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inView.add(entry.target);
          else inView.delete(entry.target);
        }
        schedule();
      },
      // A section counts once it fills a good part of the screen, not at its first pixel.
      { rootMargin: "-35% 0px -35% 0px" },
    );
    quiet.forEach((el) => observer.observe(el));

    const isField = (target: EventTarget | null) =>
      target instanceof HTMLElement && target.matches("input, textarea, select, [contenteditable]");
    const onFocusIn = (event: FocusEvent) => {
      if (!isField(event.target)) return;
      typing = true;
      schedule();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!isField(event.target)) return;
      typing = false;
      schedule();
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return (
    <div
      ref={ref}
      data-page-content
      data-track-context="mobile-dock"
      className="mobile-dock fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <nav
        aria-label="Quick contact"
        className="flex h-[3.75rem] items-center gap-2 rounded-[1.25rem] bg-[#08122c]/82 p-2 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.55)] ring-1 ring-white/10 backdrop-blur-xl"
      >
        <a
          href={phoneHref}
          aria-label={`Call ${phoneDisplay}`}
          className="grid size-11 shrink-0 place-items-center rounded-[0.875rem] bg-[#89a818] text-white transition-transform active:scale-95"
        >
          <PhoneIcon className="size-5" />
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[0.875rem] bg-white/10 font-display text-sm font-bold text-white transition-transform active:scale-[0.97]"
        >
          <WhatsAppIcon className="size-[18px] shrink-0 text-whatsapp" />
          WhatsApp
        </a>
        <a
          href={quote}
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[0.875rem] bg-white font-display text-sm font-bold text-navy-900 transition-transform active:scale-[0.97]"
        >
          Get a quote
          <ArrowRightIcon className="size-2.5 shrink-0" />
        </a>
      </nav>
    </div>
  );
}

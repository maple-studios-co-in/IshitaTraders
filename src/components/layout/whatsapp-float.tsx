"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { contactLinks } from "@/admin/content/links";
import type { SiteSettings } from "@/admin/content/settings-schema";
import { WhatsAppIcon } from "@/components/icons";

/** Space kept between the button and anything it rises above. */
const GAP = 12;

/**
 * The floating WhatsApp button, bottom right on every page. On a product page it asks about that
 * product (the page marks itself with `data-whatsapp-subject`).
 *
 * It never covers the other bottom-of-screen pieces. It rises above anything marked
 * `data-whatsapp-avoid` while that is on screen: the homepage film's corner cards and brand names
 * (`="film"`: only until the page slides over them), and the footer's last line. On phones it also
 * rides above the quick-contact dock (globals.css) and steps aside while a form field is focused,
 * so it never sits over the keyboard.
 */
export function WhatsAppFloat({ contact, businessName }: { contact: SiteSettings["contact"]; businessName: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const links = contactLinks(contact);
  const [product, setProduct] = useState<{ slug: string; subject: string } | null>(null);

  // Read a frame after each page change, and again just before a click, in case the page streamed in late.
  const readProduct = useCallback(() => {
    const page = document.querySelector<HTMLElement>("main [data-whatsapp-subject]");
    const subject = page?.dataset.whatsappSubject ?? "";
    const slug = page?.dataset.productSlug ?? "";
    setProduct((current) =>
      subject ? (current?.subject === subject && current.slug === slug ? current : { slug, subject }) : null,
    );
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(readProduct);
    return () => cancelAnimationFrame(frame);
  }, [pathname, readProduct]);

  useEffect(() => {
    const float = ref.current;
    if (!float) return;
    const cover = document.querySelector("[data-hero-cover]");
    const range = document.createRange();
    let typing = false;
    let raf = 0;

    /** The on-screen part of an avoided element's content (text and child boxes, not its full width). */
    const visibleBox = (el: HTMLElement) => {
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return null;
      range.selectNodeContents(el);
      const box = range.getBoundingClientRect();
      if (box.width === 0 || box.bottom <= 0 || box.top >= window.innerHeight) return null;
      if (el.dataset.whatsappAvoid !== "film" || !cover) return box;
      // The film sits under the page that slides over it: only its uncovered part counts.
      const coverTop = cover.getBoundingClientRect().top;
      return coverTop <= box.top
        ? null
        : { left: box.left, right: box.right, top: box.top, bottom: Math.min(box.bottom, coverTop) };
    };

    const update = () => {
      raf = 0;
      // The wrapper never moves (only the link inside it is lifted), so it marks the resting place.
      const rest = float.getBoundingClientRect();
      const avoided = Array.from(document.querySelectorAll<HTMLElement>("[data-whatsapp-avoid]"), visibleBox);
      let lift = 0;
      // Stacked rows (film cards, then brand names above them) may need a second pass.
      for (let pass = 0, moved = true; moved && pass < 3; pass++) {
        moved = false;
        const bottom = rest.bottom - lift;
        for (const box of avoided) {
          if (!box || box.right <= rest.left || box.left >= rest.right) continue;
          if (box.top < bottom + GAP && box.bottom > bottom - rest.height - GAP) {
            lift = Math.max(lift, rest.bottom - box.top + GAP);
            moved = true;
          }
        }
      }
      // Never float into the middle of the screen; past that, overlapping is the lesser evil.
      if (lift > window.innerHeight * 0.45) lift = 0;
      float.style.setProperty("--wa-lift", `${Math.round(lift)}px`);
      float.toggleAttribute("data-typing", typing);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

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
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  const href = product ? links.enquiry(product.subject) : links.whatsapp();
  const label = product
    ? `Ask ${businessName} about this product on WhatsApp (opens in a new tab)`
    : `Chat with ${businessName} on WhatsApp (opens in a new tab)`;

  return (
    <div ref={ref} data-page-content className="whatsapp-float print:hidden">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        data-track-context="whatsapp-float"
        data-product-slug={product?.slug || undefined}
        onPointerDown={readProduct}
        onFocus={readProduct}
        className="group relative grid size-full place-items-center rounded-full bg-whatsapp text-white shadow-[0_14px_30px_-10px_rgb(18_140_70/0.7),0_3px_8px_rgb(0_0_0/0.18)] outline-offset-4 outline-navy-700 hover:bg-[#1ebe5d] focus-visible:outline-3"
      >
        <span aria-hidden="true" className="whatsapp-float-ring" />
        <WhatsAppIcon aria-hidden="true" className="relative size-[52%]" />
        <span aria-hidden="true" className="whatsapp-float-label">
          {product ? "Ask about this product" : "Chat with us"}
        </span>
      </a>
    </div>
  );
}

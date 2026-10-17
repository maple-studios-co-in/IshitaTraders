"use client";

import { useEffect, useRef, useState } from "react";

import type { PublicTestimonial } from "@/admin/content/public-types";
import { TestimonialCard } from "@/components/sections/testimonial-card";
import { RailProgress } from "@/components/ui/rail-progress";
import { cn } from "@/lib/cn";

import { FigmaIcon } from "./figma-icons";

/**
 * The review cards: a swipe rail on phones (every review), a grid from tablets up that opens
 * `initial` at a time with "View More". Focus moves to the first newly shown review.
 */
export function ReviewGrid({
  items,
  initial,
  moreLabel,
}: {
  items: PublicTestimonial[];
  initial: number;
  moreLabel: string;
}) {
  const [visible, setVisible] = useState(initial);
  const listRef = useRef<HTMLUListElement>(null);
  const focusIndex = useRef<number | null>(null);

  useEffect(() => {
    const index = focusIndex.current;
    if (index === null) return;
    focusIndex.current = null;
    listRef.current?.querySelectorAll<HTMLElement>(":scope > li")[index]?.focus({ preventScroll: true });
  }, [visible]);

  const showMore = () => {
    focusIndex.current = visible;
    setVisible((count) => count + initial);
  };

  return (
    <>
      <ul
        ref={listRef}
        className="mt-8 grid gap-6 max-md:mobile-rail max-md:[--rail-item:min(86%,24rem)] md:grid-cols-2 lg:mt-[42px] lg:grid-cols-3 lg:gap-x-[clamp(1.75rem,4vw,3.5rem)] lg:gap-y-10"
      >
        {items.map((item, index) => (
          <li
            key={item.id}
            tabIndex={-1}
            className={cn(
              "flex rounded-[8px] transition-[translate] duration-500 ease-out-expo outline-none hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#1e3a8a]/40",
              index >= visible && "md:hidden",
              index >= initial && "md:motion-safe:animate-[dropdown-in_0.45s_ease-out_both]",
            )}
          >
            <TestimonialCard item={item} active={false} className="select-text" />
          </li>
        ))}
      </ul>
      <RailProgress />
      {visible < items.length ? (
        <div className="mt-10 hidden justify-center md:flex lg:mt-[50px]">
          <button
            type="button"
            onClick={showMore}
            className="group inline-flex items-center gap-2.5 rounded-[10px] bg-[#1e3a8a] px-[29px] py-[14px] text-[17px] leading-[24.5px] font-semibold text-white shadow-[0_1px_1px_rgb(0_0_0/0.05)] transition-colors duration-300 hover:bg-[#172f72]"
          >
            {moreLabel}
            <FigmaIcon
              name="arrowWhiteSmall"
              className="size-5 transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
            />
          </button>
        </div>
      ) : null}
    </>
  );
}

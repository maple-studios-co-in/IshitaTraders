"use client";

import Image from "next/image";
import { LazyMotion, animate, m, useInView, useMotionValue, useReducedMotion, type PanInfo } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import arrowArt from "@/assets/images/carousel/arrow.svg";
import { CheckCircleIcon, MedicalIcon, QuoteIcon, StarIcon, StorefrontIcon } from "@/components/icons";
import { resolveImage } from "@/admin/content/images";
import type { PublicTestimonial as Testimonial } from "@/admin/content/public-types";
import type { TestimonialBadge } from "@/admin/content/types";
import { cn } from "@/lib/cn";

const loadDragFeatures = () => import("@/components/motion/dom-max").then((mod) => mod.default);

const EASE = [0.16, 1, 0.3, 1] as const;
const AUTOPLAY_MS = 5000;

/** The pager shows at most four dots (Figma 323:2347); each covers an equal run of slides. */
const MAX_DOTS = 4;

const twoDigits = (value: number) => String(value).padStart(2, "0");

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const badgeStyles: Record<
  TestimonialBadge,
  { Icon?: typeof CheckCircleIcon; className: string; iconClassName?: string }
> = {
  installation: {
    Icon: CheckCircleIcon,
    className: "bg-[rgb(52_177_226/0.55)] text-black",
    iconClassName: "h-[14.7px] w-[17.4px]",
  },
  commercial: {
    Icon: StorefrontIcon,
    className: "bg-[rgb(52_177_226/0.55)] text-black",
    iconClassName: "h-[14.7px] w-[13.4px]",
  },
  healthcare: {
    Icon: MedicalIcon,
    className: "bg-[rgb(116_143_15/0.45)] text-[#002115]",
    iconClassName: "h-[13.4px] w-[16px]",
  },
  sample: { className: "bg-slate-200 text-slate-600" },
};

interface Metrics {
  viewport: number;
  card: number;
  step: number;
}

export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const count = items.length;
  // Three copies let the track loop seamlessly in both directions.
  const slides = useMemo(() => [...items, ...items, ...items], [items]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [index, setIndex] = useState(count);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const x = useMotionValue(0);
  const jumpNext = useRef(true);
  const reduceMotion = useReducedMotion();
  const inView = useInView(viewportRef, { margin: "0px 0px -20% 0px" });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const cards = viewport.querySelectorAll<HTMLElement>("[data-slide]");
      if (cards.length < 2) return;
      // Sub-pixel rects, not offsetLeft/offsetWidth: those round to whole pixels, and the rounding
      // error multiplies by the slide index (75 slides with 25 testimonials ≈ 10px off-centre).
      const first = cards[0].getBoundingClientRect();
      const second = cards[1].getBoundingClientRect();
      setMetrics({
        viewport: viewport.getBoundingClientRect().width,
        card: first.width,
        step: second.left - first.left,
      });
      jumpNext.current = true;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const offsetFor = useCallback(
    (slideIndex: number) => (metrics ? metrics.viewport / 2 - (slideIndex * metrics.step + metrics.card / 2) : 0),
    [metrics],
  );

  // Move the track whenever the active slide (or layout) changes.
  useEffect(() => {
    if (!metrics) return;
    const target = offsetFor(index);
    if (jumpNext.current || reduceMotion) {
      jumpNext.current = false;
      x.jump(target);
      return;
    }
    let cancelled = false;
    const controls = animate(x, target, { duration: 0.75, ease: EASE });
    controls.then(() => {
      // Re-centre into the middle copy without a visible jump.
      if (!cancelled && (index < count || index >= count * 2)) {
        jumpNext.current = true;
        setIndex((index % count) + count);
      }
    });
    return () => {
      cancelled = true;
      controls.stop();
    };
  }, [index, metrics, offsetFor, x, count, reduceMotion]);

  const paused = hovered || dragging || !inView || reduceMotion === true;

  useEffect(() => {
    if (paused || !metrics) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex((current) => current + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, metrics]);

  const settle = (next: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, next));
    if (clamped === index) {
      animate(x, offsetFor(clamped), { duration: 0.5, ease: EASE });
    } else {
      setIndex(clamped);
    }
  };

  const onDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    setDragging(false);
    if (!metrics) return;
    const position = (metrics.viewport / 2 - metrics.card / 2 - x.get()) / metrics.step;
    let next = Math.round(position);
    if (Math.abs(info.velocity.x) > 350) next = info.velocity.x < 0 ? Math.ceil(position) : Math.floor(position);
    settle(next);
  };

  const activeSlide = ((index % count) + count) % count;
  const dotCount = Math.min(MAX_DOTS, count);
  const slidesPerDot = Math.ceil(count / dotCount);
  const activeDot = Math.floor(activeSlide / slidesPerDot);

  return (
    <LazyMotion features={loadDragFeatures}>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Client testimonials"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocusCapture={() => setHovered(true)}
        onBlurCapture={() => setHovered(false)}
      >
        <div className="relative">
          <div ref={viewportRef} className="overflow-hidden py-6">
            <m.ul
              className={cn(
                "flex w-max touch-pan-y items-stretch gap-[clamp(1.25rem,3.5vw,3.2rem)] transition-opacity duration-300",
                metrics ? "opacity-100" : "opacity-0",
              )}
              style={{ x }}
              drag="x"
              dragMomentum={false}
              dragElastic={0.12}
              onDragStart={() => setDragging(true)}
              onDragEnd={onDragEnd}
            >
              {slides.map((item, slideIndex) => {
                const isClone = slideIndex < count || slideIndex >= count * 2;
                return (
                  <li
                    key={`${item.id}-${slideIndex}`}
                    data-slide
                    aria-hidden={isClone || undefined}
                    inert={isClone || undefined}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={isClone ? undefined : `${(slideIndex % count) + 1} of ${count}`}
                    className="flex w-[min(84vw,390px)] shrink-0"
                  >
                    <TestimonialCard item={item} active={slideIndex === index} />
                  </li>
                );
              })}
            </m.ul>
          </div>

          {/* Figma 323:2356 / 323:2355: 67px arrows over the carousel's edges, from tablet width up. */}
          <CarouselArrow
            direction="previous"
            onClick={() => settle(index - 1)}
            className="absolute top-[calc(50%-10.5px)] left-[clamp(1rem,3.2vw,3.125rem)] hidden -translate-y-1/2 md:block"
          />
          <CarouselArrow
            direction="next"
            onClick={() => settle(index + 1)}
            className="absolute top-[calc(50%-10.5px)] right-[clamp(1rem,3.2vw,3.125rem)] hidden -translate-y-1/2 md:block"
          />
        </div>

        <div className="mt-4 flex items-center justify-center gap-5">
          <CarouselArrow direction="previous" onClick={() => settle(index - 1)} className="size-11 md:hidden" />
          {/* Figma 323:2349: progress dots, then "current / total". */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-[14px]">
              {Array.from({ length: dotCount }, (_, dot) => {
                const first = dot * slidesPerDot;
                const last = Math.min(count, first + slidesPerDot);
                return (
                  <button
                    key={dot}
                    type="button"
                    onClick={() => settle(count + first)}
                    aria-label={
                      slidesPerDot === 1
                        ? `Show testimonial ${first + 1} of ${count}`
                        : `Show testimonials ${first + 1}–${last} of ${count}`
                    }
                    aria-current={dot === activeDot ? "true" : undefined}
                    className={cn(
                      "relative size-[17px] rounded-full transition-colors duration-300 after:absolute after:-inset-[7px]",
                      dot === activeDot ? "bg-navy-900" : "bg-[#dee6f5] hover:bg-[#c5d2ec]",
                    )}
                  />
                );
              })}
            </div>
            <p
              aria-hidden="true"
              className="text-[18.385px] leading-[26.265px] font-semibold tracking-[0.01em] whitespace-nowrap text-[#51617b] tabular-nums"
            >
              {twoDigits(activeSlide + 1)} / {twoDigits(count)}
            </p>
          </div>
          <CarouselArrow direction="next" onClick={() => settle(index + 1)} className="size-11 md:hidden" />
        </div>
      </div>
    </LazyMotion>
  );
}

function CarouselArrow({
  direction,
  onClick,
  className,
}: {
  direction: "previous" | "next";
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "next" ? "Next testimonial" : "Previous testimonial"}
      className={cn(
        "relative z-10 size-[67px] shrink-0 rounded-full transition-[scale] duration-200 ease-out hover:scale-105 active:scale-95",
        className,
      )}
    >
      {/* The design's own art (white disc, navy chevron, soft drop shadow); "previous" is the same art mirrored. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-[-23.88%_-29.85%_-35.82%_-29.85%]",
          direction === "previous" && "-scale-x-100",
        )}
      >
        <Image src={arrowArt} alt="" className="block size-full max-w-none" />
      </span>
    </button>
  );
}

function TestimonialCard({ item, active }: { item: Testimonial; active: boolean }) {
  const badge = badgeStyles[item.badge.kind] ?? badgeStyles.sample;
  const avatar = resolveImage(item.avatar, item.name);

  return (
    <figure
      className={cn(
        "flex min-h-[396px] w-full flex-col justify-between overflow-hidden rounded-[8px] p-6 pb-0 transition-[background-color,box-shadow,translate] duration-500 ease-out-expo select-none",
        active
          ? "-translate-y-2 bg-surface shadow-[0_5px_13px_rgb(0_0_0/0.05),0_4px_6px_-1px_rgb(0_0_0/0.1)]"
          : "bg-white shadow-card",
      )}
    >
      <div>
        <div className="flex items-center justify-between pb-4">
          <span
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-xl px-2 text-[11px] leading-[14px] font-bold tracking-[0.04em]",
              badge.className,
            )}
          >
            {badge.Icon ? <badge.Icon className={badge.iconClassName} /> : null}
            {item.badge.label}
          </span>
          <QuoteIcon className="size-[47px] text-surface-tint" />
        </div>
        <div className="flex items-center gap-1.5 pb-2" aria-label={`Rated ${item.rating} out of 5`}>
          <span className="flex" aria-hidden="true">
            {Array.from({ length: 5 }, (_, star) => (
              <StarIcon
                key={star}
                className={cn("h-[22px] w-[23px]", star < item.rating ? "text-[#ffc107]" : "text-slate-300")}
              />
            ))}
          </span>
          <span className="text-[13.5px] font-semibold tracking-[0.04em] text-body">{item.rating.toFixed(1)}</span>
        </div>
        <blockquote className={cn("text-[14px] leading-[22.8px]", active ? "text-ink" : "text-body")}>
          <p>“{item.quote}”</p>
        </blockquote>
      </div>

      <figcaption
        className={cn(
          "-mx-6 mt-6 flex items-center gap-2 p-4 transition-colors duration-500",
          active ? "bg-surface-tint" : "bg-[#f0f3ff]",
        )}
      >
        {avatar ? (
          <Image
            src={avatar.src}
            alt=""
            width={44}
            height={44}
            // Tiny and shared by every loop copy — load up front so slides never pop in mid-transition.
            loading="eager"
            className="size-11 shrink-0 rounded-xl object-cover shadow-soft"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white font-display text-sm font-bold text-navy-900 shadow-soft"
          >
            {initials(item.name)}
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-lg leading-6 font-bold text-navy-900">{item.name}</span>
          <span className="text-xs leading-[18px] text-body">{item.location}</span>
        </span>
      </figcaption>
    </figure>
  );
}

"use client";

import Image from "next/image";
import { LazyMotion, animate, m, useInView, useMotionValue, useReducedMotion, type PanInfo } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MedicalIcon,
  QuoteIcon,
  StarIcon,
  StorefrontIcon,
} from "@/components/icons";
import type { Testimonial, TestimonialBadge } from "@/content/home";
import { cn } from "@/lib/cn";

const loadDragFeatures = () => import("@/components/motion/dom-max").then((mod) => mod.default);

const EASE = [0.16, 1, 0.3, 1] as const;
const AUTOPLAY_MS = 5000;

const badgeStyles: Record<
  TestimonialBadge,
  { Icon: typeof CheckCircleIcon; className: string; iconClassName: string }
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
      setMetrics({
        viewport: viewport.clientWidth,
        card: cards[0].offsetWidth,
        step: cards[1].offsetLeft - cards[0].offsetLeft,
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

  const activeDot = ((index % count) + count) % count;

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
                  key={`${item.name}-${slideIndex}`}
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

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => settle(index - 1)}
            aria-label="Previous testimonial"
            className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-navy-900 shadow-soft transition-colors hover:border-navy-800 hover:bg-navy-800 hover:text-white"
          >
            <ChevronLeftIcon className="h-3 w-2" />
          </button>
          <div className="flex items-center gap-2">
            {items.map((item, dot) => (
              <button
                key={item.name}
                type="button"
                onClick={() => settle(count + dot)}
                aria-label={`Show testimonial ${dot + 1} of ${count}`}
                aria-current={dot === activeDot ? "true" : undefined}
                className="flex h-6 items-center"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all duration-500 ease-out-expo",
                    dot === activeDot ? "w-7 bg-navy-800" : "w-2 bg-navy-800/25 hover:bg-navy-800/50",
                  )}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => settle(index + 1)}
            aria-label="Next testimonial"
            className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-navy-900 shadow-soft transition-colors hover:border-navy-800 hover:bg-navy-800 hover:text-white"
          >
            <ChevronRightIcon className="h-3 w-2" />
          </button>
        </div>
      </div>
    </LazyMotion>
  );
}

function TestimonialCard({ item, active }: { item: Testimonial; active: boolean }) {
  const badge = badgeStyles[item.badge.kind];

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
            <badge.Icon className={badge.iconClassName} />
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
        <Image
          src={item.avatar.src}
          alt=""
          width={44}
          height={44}
          // Tiny and shared by every loop copy — load up front so slides never pop in mid-transition.
          loading="eager"
          className="size-11 shrink-0 rounded-xl object-cover shadow-soft"
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-lg leading-6 font-bold text-navy-900">{item.name}</span>
          <span className="text-xs leading-[18px] text-body">{item.location}</span>
        </span>
      </figcaption>
    </figure>
  );
}

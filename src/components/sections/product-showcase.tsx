"use client";

import Image from "next/image";
import { AnimatePresence, m, useMotionValueEvent, useScroll, type Variants } from "motion/react";
import { useRef, useState, type CSSProperties } from "react";

import { ArrowRightIcon } from "@/components/icons";
import { Reveal } from "@/components/motion/reveal";
import { ButtonArrow } from "@/components/ui/button";
import { SmartLink } from "@/components/ui/smart-link";
import { sectionIds } from "@/config/navigation";
import type { ResolvedShowcaseSlide as ShowcaseSlide } from "@/content/home";
import { cn } from "@/lib/cn";
import { getSmoothScroll } from "@/lib/smooth-scroll";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Converts a length on the 1920×1036 Figma artboard into viewport-scaled CSS. */
const u = (px: number) => `calc(var(--u) * ${px})`;

export function ProductShowcase({ slides }: { slides: ShowcaseSlide[] }) {
  return (
    <section id={sectionIds.solarRange} aria-labelledby="solar-range-title" className="relative bg-white">
      <h2 id="solar-range-title" className="sr-only">
        Our solar range: solar panels, inverters and batteries
      </h2>
      <PinnedShowcase slides={slides} />
      <StackedShowcase slides={slides} />
    </section>
  );
}

/* ---------------------------------------------------------------- desktop */

const textVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, y: direction * 48 }),
  center: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, staggerChildren: 0.05, delayChildren: 0.05 } },
  exit: (direction: number) => ({ opacity: 0, y: direction * -48, transition: { duration: 0.45, ease: EASE } }),
};

const lineVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, y: direction * 28 }),
  center: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

const imageVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, y: direction * 90, scale: 0.94 }),
  center: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.9, ease: EASE } },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction * -90,
    scale: 0.96,
    transition: { duration: 0.5, ease: EASE },
  }),
};

const headlineVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, y: `${direction * 60}%` }),
  center: { opacity: 1, y: "0%", transition: { duration: 0.8, ease: EASE } },
  exit: (direction: number) => ({ opacity: 0, y: `${direction * -60}%`, transition: { duration: 0.45, ease: EASE } }),
};

function PinnedShowcase({ slides }: { slides: ShowcaseSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ index: 0, direction: 1 });
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const next = Math.min(slides.length - 1, Math.max(0, Math.floor(progress * slides.length)));
    setState((current) =>
      current.index === next ? current : { index: next, direction: next > current.index ? 1 : -1 },
    );
  });

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const scrollable = track.offsetHeight - window.innerHeight;
    const target = trackTop + (scrollable * (index + 0.5)) / slides.length;
    const lenis = getSmoothScroll();
    if (lenis) lenis.scrollTo(target, { duration: 1 });
    else window.scrollTo({ top: target, behavior: "smooth" });
  };

  const slide = slides[state.index];

  return (
    <div ref={trackRef} className="relative hidden lg:block" style={{ height: `${slides.length * 100}svh` }}>
      <div
        className="sticky top-(--header-h) h-[calc(100svh-var(--header-h))] overflow-hidden"
        style={{ "--u": "min(calc(100vw / 1920), calc((100svh - var(--header-h)) / 1036))" } as CSSProperties}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: u(1920), height: u(1036) }}
        >
          {/* Soft blue glow + white disc from the Figma artboard. */}
          <div
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              left: u(6),
              top: u(-524),
              width: u(1908),
              height: u(1908),
              background:
                "radial-gradient(circle closest-side, rgb(38 90 181) 0%, rgb(38 90 181 / 0.98) 18%, rgb(38 90 181 / 0.84) 34.6%, rgb(38 90 181 / 0.5) 51%, rgb(38 90 181 / 0.16) 67.3%, rgb(38 90 181 / 0.02) 83.6%, rgb(38 90 181 / 0) 100%)",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute rounded-full bg-white"
            style={{ left: u(513), top: u(-103), width: u(894), height: u(894) }}
          />

          {/* Headline ticker inside the white disc */}
          <div
            className="absolute overflow-hidden"
            style={{ left: u(641), top: u(125), width: u(639), height: u(200) }}
          >
            <AnimatePresence initial={false} custom={state.direction}>
              <m.p
                key={state.index}
                custom={state.direction}
                variants={headlineVariants}
                initial="enter"
                animate="center"
                exit="exit"
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 top-0 text-center font-jost leading-[1.04] uppercase",
                  state.index === 1 ? "text-[#656565]" : "text-black/50",
                )}
                style={{ fontSize: u(60) }}
              >
                {slide.headline.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </m.p>
            </AnimatePresence>
          </div>

          {/* Product image */}
          <AnimatePresence initial={false} custom={state.direction}>
            <m.div
              key={state.index}
              custom={state.direction}
              variants={imageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: u(277), height: u(667) }}
            >
              {/* The product shots are slices of one sprite; feather the cut edges of their baked-in shadows. */}
              <Image
                src={slide.image.src}
                alt={slide.image.alt}
                sizes="(min-width: 1920px) 720px, 38vw"
                className="h-full w-auto max-w-none [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)]"
              />
            </m.div>
          </AnimatePresence>

          {/* Copy column */}
          <AnimatePresence initial={false} custom={state.direction}>
            <m.div
              key={state.index}
              custom={state.direction}
              variants={textVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute font-jost text-black"
              style={{ left: u(85), top: u(93), width: u(661), height: u(834) }}
            >
              <m.p
                variants={lineVariants}
                className="absolute top-0 left-0 leading-[1.04] font-medium uppercase"
                style={{ fontSize: u(45), width: u(460) }}
              >
                {slide.category}
              </m.p>
              <m.h3
                variants={lineVariants}
                className="absolute left-0 leading-[1.04] font-medium"
                style={{ top: u(72), fontSize: u(90), width: u(420) }}
              >
                {slide.title.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </m.h3>
              <span
                aria-hidden="true"
                className="absolute w-px bg-black"
                style={{ left: u(8), top: u(269), height: u(437) }}
              />
              <m.p
                variants={lineVariants}
                className="absolute leading-[1.04] font-medium"
                style={{ left: u(30), top: u(274), fontSize: u(45), width: u(520) }}
              >
                {slide.tagline[0]}
                <br />
                {slide.tagline[1]}
              </m.p>
              <m.p
                variants={lineVariants}
                className="absolute leading-[1.04] font-light"
                style={{ left: u(30), top: u(400), fontSize: u(25), width: u(375) }}
              >
                {slide.description}
              </m.p>
              <m.ul
                variants={lineVariants}
                className="absolute list-disc leading-[1.04] font-light marker:text-black/70"
                style={{ left: u(30), top: u(594), fontSize: u(30), width: u(430), paddingLeft: u(30) }}
              >
                {slide.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </m.ul>
              <m.div variants={lineVariants} className="absolute" style={{ left: u(4), top: u(760) }}>
                <SmartLink
                  href={slide.cta.href}
                  className={cn(
                    "group/link flex items-center justify-center gap-2 border font-sans font-medium tracking-[-0.03em] text-black transition-colors duration-300 hover:bg-navy-800 hover:text-white",
                    state.index === 0 ? "border-[#4059aa] hover:border-navy-800" : "border-black hover:border-navy-800",
                  )}
                  style={{ width: u(362), height: u(74), borderRadius: u(10), fontSize: u(21.4) }}
                >
                  {slide.cta.label}
                  <ButtonArrow>
                    <ArrowRightIcon style={{ width: u(14), height: u(14) }} />
                  </ButtonArrow>
                </SmartLink>
              </m.div>
            </m.div>
          </AnimatePresence>

          {/* Step indicator */}
          <nav
            aria-label="Solar range"
            className="absolute flex flex-col gap-3"
            style={{ right: u(72), top: "50%", translate: "0 -50%" }}
          >
            {slides.map((item, index) => (
              <button
                key={item.category}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Show ${item.title.join(" ")}`}
                aria-current={index === state.index ? "step" : undefined}
                className="group flex h-8 w-6 items-center justify-center"
              >
                <span
                  className={cn(
                    "block w-1 rounded-full transition-all duration-500 ease-out-expo",
                    index === state.index ? "h-8 bg-navy-800" : "h-3 bg-navy-800/25 group-hover:bg-navy-800/50",
                  )}
                />
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- mobile */

function StackedShowcase({ slides }: { slides: ShowcaseSlide[] }) {
  return (
    <div className="relative overflow-hidden py-16 lg:hidden">
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 size-[140vw] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(circle_closest-side,rgb(38_90_181/0.35),rgb(38_90_181/0)_100%)]"
      />
      <div className="relative container-site flex flex-col gap-16">
        {slides.map((slide) => (
          <Reveal key={slide.category} as="article" className="grid items-center gap-8 sm:grid-cols-2">
            <div className="relative mx-auto aspect-square w-full max-w-[420px] rounded-full bg-white p-6 shadow-[0_0_80px_rgb(38_90_181/0.25)]">
              <Image
                src={slide.image.src}
                alt={slide.image.alt}
                sizes="(min-width: 640px) 45vw, 90vw"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="font-jost text-black">
              <p className="text-xl font-medium uppercase">{slide.category}</p>
              <h3 className="mt-1 text-5xl leading-[1.04] font-medium">{slide.title.join(" ")}</h3>
              <div className="mt-6 border-l border-black pl-5">
                <p className="text-2xl leading-[1.1] font-medium">
                  {slide.tagline[0]}
                  <br />
                  {slide.tagline[1]}
                </p>
                <p className="mt-4 text-lg leading-snug font-light">{slide.description}</p>
                <ul className="mt-4 list-disc pl-5 text-lg font-light">
                  {slide.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
              <SmartLink
                href={slide.cta.href}
                className="group/link mt-6 inline-flex h-14 items-center justify-center gap-2 rounded-[10px] border border-black px-8 font-sans text-base font-medium tracking-[-0.02em] transition-colors hover:bg-navy-800 hover:text-white"
              >
                {slide.cta.label}
                <ButtonArrow>
                  <ArrowRightIcon className="size-3" />
                </ButtonArrow>
              </SmartLink>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties, type Ref } from "react";

import logoMark from "@/assets/images/brand/logo-mark.png";
import { sectionIds } from "@/config/navigation";
import { frameUrl, heroCards, heroCredit, heroFilm, heroHotspots, heroScrollCue, type HeroCard } from "@/content/hero";
import { heroSceneSizes } from "@/content/hero-scenes";
import { cn } from "@/lib/cn";

import { startHeroFilm } from "./hero-controller";

const TALL_MEDIA = `(max-aspect-ratio: ${Math.round(heroFilm.tallBelowAspect * 100)}/100)`;

/**
 * Homepage hero — a scroll-scrubbed film with caption scenes, floating corner cards and a
 * "charging" loader (src/components/hero/hero-controller.ts drives it). The markup is complete
 * without JavaScript: the opening still, the page heading and every link render on the server.
 */
export function HeroFilm({ scenes, brands }: { scenes: string[]; brands: string[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLParagraphElement>(null);
  const sceneRefs = useRef<(HTMLElement | null)[]>([]);
  const hotspotRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    return startHeroFilm({
      section,
      canvas,
      loader: loaderRef.current,
      cue: cueRef.current,
      cards: [...section.querySelectorAll<HTMLElement>(".hero-card")],
      scenes: sceneRefs.current.filter((node): node is HTMLElement => node !== null),
      hotspots: hotspotRefs.current.filter((node): node is HTMLDivElement => node !== null),
    });
  }, []);

  const scroll = {
    "--film-play-desktop": `${heroFilm.desktop.play}px`,
    "--film-hold-desktop": `${heroFilm.desktop.hold}px`,
    "--film-play-mobile": `${heroFilm.mobile.play}px`,
    "--film-hold-mobile": `${heroFilm.mobile.hold}px`,
  } as CSSProperties;

  return (
    <section ref={sectionRef} id={sectionIds.home} aria-labelledby="hero-title" className="hero-film" style={scroll}>
      <div className="hero-stage">
        <picture>
          <source media={TALL_MEDIA} srcSet={frameUrl(heroFilm.tall, 0)} />
          {/* The film's first frame doubles as the poster (a pre-sized frame the canvas reuses, so no
              next/image); the canvas paints over it once ready. */}
          <img
            src={frameUrl(heroFilm.wide, 0)}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        </picture>
        <canvas ref={canvasRef} aria-hidden="true" className="hero-canvas" />
        <div aria-hidden="true" className="absolute inset-0 bg-black/16" />

        <div className="absolute inset-x-0 top-0 h-svh">
          {scenes.map((text, index) => {
            const Tag = index === 0 ? "h1" : "p";
            return (
              <Tag
                key={index}
                id={index === 0 ? "hero-title" : undefined}
                ref={(node: HTMLElement | null) => {
                  sceneRefs.current[index] = node;
                }}
                className="hero-scene"
                data-size={heroSceneSizes[index]}
                data-active={index === 0 ? "" : undefined}
                aria-hidden={index === 0 ? undefined : "true"}
              >
                {text}
              </Tag>
            );
          })}

          <p ref={cueRef} aria-hidden="true" className="hero-cue">
            {heroScrollCue}
          </p>

          {heroHotspots.map((spot, index) => (
            <div
              key={spot.label}
              ref={(node) => {
                hotspotRefs.current[index] = node;
              }}
              aria-hidden="true"
              className="hero-hotspot"
            >
              <span className="grid size-8 place-items-center rounded-lg glass-pill text-white">
                <BoltIcon className="size-4" />
              </span>
              <span className="rounded-lg glass-pill px-3 py-2 font-wide text-xs leading-4 tracking-[-0.03em] text-white">
                {spot.label}
              </span>
            </div>
          ))}

          <div className="absolute inset-x-3 bottom-3 flex flex-col gap-3 md:inset-x-4 md:bottom-4">
            <p className="font-wide text-[9px] leading-normal text-white/80 md:text-[10px]">{heroCredit}</p>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
              <HeroCardLink card={heroCards.savings} className="max-md:hidden" />
              {brands.length > 0 ? (
                <ul
                  aria-label="Brands we supply"
                  className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 opacity-80 md:flex-1 xl:gap-x-7"
                >
                  {brands.map((brand) => (
                    <li
                      key={brand}
                      className="flex items-center gap-1.5 font-wide text-[11px] font-bold tracking-[0.02em] text-white uppercase md:text-[13px]"
                    >
                      <BoltIcon className="size-3 text-[#b8d84a]" />
                      {brand}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex gap-2.5 md:contents">
                <HeroCardLink card={heroCards.savings} className="flex-1 md:hidden" />
                <HeroCardLink card={heroCards.products} className="flex-1 md:flex-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <HeroLoader ref={loaderRef} />
      {/* Without JavaScript the film can't play: collapse to the opening still and skip the loader. */}
      <noscript>
        <style>{`.hero-film{height:100lvh;margin-bottom:0}.hero-loader{display:none}`}</style>
      </noscript>
    </section>
  );
}

function HeroCardLink({ card, className }: { card: HeroCard; className?: string }) {
  const [first, ...rest] = card.title.split(" ");
  return (
    <a
      href={card.href}
      aria-label={card.title}
      className={cn(
        "hero-card group relative flex h-[71px] min-w-0 items-center gap-4 overflow-hidden rounded-[24px] bg-white pr-2 pl-4 text-[#0b0b0b] shadow-[0_10px_30px_-14px_rgb(0_0_0/0.45)] md:h-20 md:pl-6",
        className,
      )}
    >
      <CardWave />
      <span className="relative font-wide text-[13px] leading-[1.2] tracking-[-0.04em] md:text-sm">
        {first}
        <br />
        {rest.join(" ")}
      </span>
      <span className="relative hidden gap-3 xl:flex">
        {card.thumbs.map((thumb) => (
          <Image
            key={thumb.alt}
            src={thumb.src}
            alt=""
            sizes="68px"
            className="h-12 w-[68px] rounded-[10px] object-cover"
          />
        ))}
      </span>
      <span className="hero-card-arrow ml-auto" aria-hidden="true">
        <ChevronIcon />
        <ChevronIcon />
      </span>
    </a>
  );
}

/** The lime "energy" wave in each card's corner, behind the arrow. */
function CardWave() {
  return (
    <svg
      viewBox="0 0 132 80"
      aria-hidden="true"
      className="hero-card-wave pointer-events-none absolute top-0 right-0 h-full w-auto"
    >
      <path d="M56 0H132V80H117C128 67 131 49 122 33C113 17 94 9 75 7C65 6 59 4 56 0Z" fill="#c3dc5c" />
      <path d="M83 0H132V52C127 35 116 21 100 16C91 13 86 8 83 0Z" fill="#89a818" />
    </svg>
  );
}

function HeroLoader({ ref }: { ref: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} aria-hidden="true" className="hero-loader">
      <div className="w-[min(60rem,calc(100%-1.75rem))]">
        <div className="mb-4 flex justify-between px-3 font-wide text-sm tracking-[-0.03em] md:text-lg">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
        <div className="relative grid h-[3.75rem] place-items-center overflow-hidden rounded-[0.875rem] bg-[#141414] md:h-[7.5rem] md:rounded-[1.25rem]">
          <div className="hero-loader-fill" />
          <span className="relative flex items-center gap-2.5 md:gap-3.5">
            <Image
              src={logoMark}
              alt=""
              unoptimized
              loading="eager"
              className="h-7 w-auto brightness-0 invert md:h-10"
            />
            <span className="font-wide text-lg leading-none font-bold tracking-[-0.03em] md:text-[1.75rem]">
              ISHITA TRADERS
            </span>
          </span>
        </div>
      </div>
      <p className="absolute right-4 bottom-5 flex items-baseline font-wide text-4xl tracking-[-0.04em] md:right-[1.875rem] md:bottom-[1.625rem] md:text-5xl">
        Charging
        <span className="hero-loader-dots">
          <i />
          <i />
          <i />
        </span>
      </p>
    </div>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M9.6 1.2 3.4 9.1c-.2.3 0 .7.4.7h3.4l-1 4.9c-.1.5.5.8.8.4l6.2-7.9c.2-.3 0-.7-.4-.7H9.4l1-4.9c.1-.5-.5-.8-.8-.4Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-5 text-leaf-700" aria-hidden="true">
      <path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties, type Ref } from "react";

import logoMark from "@/assets/images/brand/logo-mark.png";
import { ArrowIcon } from "@/components/layout/line-icons";
import { sectionIds } from "@/config/navigation";
import { frameUrl, heroCards, heroCredit, heroFilm, heroScrollCue, type HeroCard } from "@/content/hero";
import { heroSceneSizes } from "@/content/hero-scenes";

import { startHeroFilm } from "./hero-controller";

const TALL_MEDIA = `(max-aspect-ratio: ${Math.round(heroFilm.tallBelowAspect * 100)}/100)`;

/**
 * Homepage hero — a scroll-scrubbed film with caption scenes, the white corner cards and the
 * brand row of Figma "Hero / Opening", and a "charging" loader (hero-controller.ts drives it).
 * The markup is complete without JavaScript: the opening still, the page heading and every link
 * render on the server.
 */
export function HeroFilm({ scenes, brands }: { scenes: string[]; brands: string[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLSpanElement>(null);
  const sceneRefs = useRef<(HTMLElement | null)[]>([]);

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
        <div aria-hidden="true" className="absolute inset-0 bg-black/8" />

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

          <p aria-hidden="true" className="hero-cue">
            <span ref={cueRef}>{heroScrollCue}</span>
            <span className="ml-[0.6em]">↓</span>
          </p>

          <p className="absolute bottom-[calc(max(7px,env(safe-area-inset-bottom))+132px)] left-[17px] text-[9px] leading-[1.5] text-white md:bottom-[100px] md:text-[10px]">
            {heroCredit}
          </p>
          {brands.length > 0 ? (
            <ul
              aria-label="Brands we supply"
              className="absolute inset-x-[17px] bottom-[calc(max(7px,env(safe-area-inset-bottom))+95px)] flex flex-wrap justify-center gap-x-[1.6em] text-[11px] leading-[1.5] font-bold text-white uppercase md:bottom-[44px] md:text-[14px]"
            >
              {brands.map((brand) => (
                <li key={brand}>{brand}</li>
              ))}
            </ul>
          ) : null}
          <div className="absolute inset-x-[17px] bottom-[max(7px,env(safe-area-inset-bottom))] flex justify-between gap-2 md:bottom-[17px]">
            <HeroCardLink card={heroCards.savings} />
            <HeroCardLink card={heroCards.products} />
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

/** Figma "Hero / Corner action": two lines of text and the lime orb. */
function HeroCardLink({ card }: { card: HeroCard }) {
  return (
    <a
      href={card.href}
      className="hero-card group flex h-[71px] max-w-[145px] min-w-0 flex-1 basis-0 items-center justify-between rounded-[24px] bg-white pr-[7px] pl-3 text-[13px] leading-[1.5] text-ish-ink shadow-[0_10px_30px_-14px_rgb(0_0_0/0.45)] min-[360px]:text-[14px] md:w-[170px] md:max-w-none md:flex-none"
    >
      <span className="min-w-0">
        <span className="block">{card.lines[0]}</span> <span className="block">{card.lines[1]}</span>
      </span>
      <span
        aria-hidden="true"
        className="grid size-[42px] shrink-0 place-items-center overflow-hidden rounded-full bg-ish-lime text-white transition-colors duration-300 group-hover:bg-ish-lime-deep"
      >
        <ArrowIcon className="size-[18px] transition-transform duration-500 ease-out-expo group-hover:-rotate-45" />
      </span>
    </a>
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

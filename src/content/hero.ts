import type { StaticImageData } from "next/image";

import batteriesThumb from "@/assets/images/categories/batteries.webp";
import inverterThumb from "@/assets/images/categories/inverters.webp";
import upsThumb from "@/assets/images/categories/online-ups.webp";
import panelsThumb from "@/assets/images/categories/solar-panels.webp";
import savingsThumb from "@/assets/images/installations/home.webp";

import { anchor, productLinks, sectionIds } from "@/config/navigation";

/**
 * The homepage hero: a scroll-scrubbed film (Figma "Hero storyboard · scroll milestones") with
 * caption scenes (see ./hero-scenes). Captions and the brand row are edited in
 * Admin → Site content → Hero; everything here is the film's fixed choreography.
 */

export interface HeroFilmSet {
  /** Folder under /public. Files are cached forever, so a new cut ships under a new folder. */
  path: string;
  width: number;
  height: number;
}

export interface HeroScroll {
  /** Scroll distance (px) over which the film plays… */
  play: number;
  /** …then how long its last frame holds before the page slides over it. */
  hold: number;
}

export const heroFilm = {
  frameCount: 140,
  /** The original 16:9 frames. */
  wide: { path: "/sequences/hero-v1/wide", width: 1920, height: 1080 } satisfies HeroFilmSet,
  /** Centre crops for portrait phones — a quarter of the bytes. */
  tall: { path: "/sequences/hero-v1/tall", width: 608, height: 1080 } satisfies HeroFilmSet,
  /** Below this viewport aspect ratio (width / height) the portrait set is used. */
  tallBelowAspect: 0.62,
  desktop: { play: 4800, hold: 300 } satisfies HeroScroll,
  mobile: { play: 3200, hold: 300 } satisfies HeroScroll,
  /** Viewport width (px) at and below which the mobile scroll distances apply. */
  mobileMaxWidth: 767,
  /** Frames fetched and decoded before the "charging" loader lets the visitor in. */
  warmFrames: 24,
};

export const frameUrl = (set: HeroFilmSet, index: number) => `${set.path}/${String(index).padStart(3, "0")}.webp`;

/**
 * Labels pinned to the two solar roofs while the camera passes them. Anchors are source-frame
 * pixels (1920×1080) where each label's icon sits when it is fully visible.
 */
export const heroHotspots = [
  { label: "On-grid rooftop solar", x: 854, y: 192 },
  { label: "Hybrid solar + battery", x: 1433, y: 288 },
];

/** Film progress where the hotspots appear, peak and disappear, and how far they drift (frame px). */
export const heroHotspotTiming = { start: 0.1875, peak: 0.3125, end: 0.4375, drift: 48 };

export interface HeroCard {
  title: string;
  href: string;
  thumbs: { src: StaticImageData; alt: string }[];
}

export const heroCards = {
  savings: {
    title: "Explore your savings",
    href: anchor(sectionIds.solar),
    thumbs: [{ src: savingsThumb, alt: "Rooftop solar on a family home" }],
  },
  products: {
    title: "Explore our products",
    href: productLinks.all,
    thumbs: [
      { src: panelsThumb, alt: "Solar panels" },
      { src: inverterThumb, alt: "Inverters" },
      { src: batteriesThumb, alt: "Batteries" },
      { src: upsThumb, alt: "Online UPS" },
    ],
  },
} satisfies Record<string, HeroCard>;

/** The film is a visualisation, not Ishita's premises — keep this credit visible. */
export const heroCredit = "Solar manufacturing visualisation";
export const heroScrollCue = "Scroll to explore";

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
  /** The 16:9 frames. v2: frames 110-139 carry the Gujarat–Rajasthan skyline. */
  wide: { path: "/sequences/hero-v2/wide", width: 1920, height: 1080 } satisfies HeroFilmSet,
  /** Centre crops for portrait phones — a quarter of the bytes. */
  tall: { path: "/sequences/hero-v2/tall", width: 608, height: 1080 } satisfies HeroFilmSet,
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

export interface HeroCard {
  /** Two lines, as in the design: "Explore" / "your savings". */
  lines: [string, string];
  href: string;
}

/** The two white corner cards on the film (Figma "Hero / Corner action"). */
export const heroCards = {
  savings: { lines: ["Explore", "your savings"], href: anchor(sectionIds.solar) },
  products: { lines: ["Explore", "our products"], href: productLinks.all },
} satisfies Record<string, HeroCard>;

/** The film is a visualisation, not Ishita's premises — keep this credit visible. */
export const heroCredit = "Solar manufacturing visualisation";
export const heroScrollCue = "Scroll to explore";

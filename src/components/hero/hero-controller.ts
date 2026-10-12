import { frameUrl, heroFilm, heroHotspots, heroHotspotTiming, heroScrollCue, type HeroFilmSet } from "@/content/hero";
import { sceneAt } from "@/content/hero-scenes";

import { FramePlayer, type FrameSource } from "./frame-player";
import { scrambleText } from "./scramble";

export interface HeroElements {
  section: HTMLElement;
  canvas: HTMLCanvasElement;
  loader: HTMLElement | null;
  cue: HTMLElement | null;
  /** Corner cards: they fade out as the film ends (the brand row stays). */
  cards: HTMLElement[];
  scenes: HTMLElement[];
  hotspots: HTMLElement[];
}

/** Loader timing: never flash it, never keep visitors waiting on a slow connection. */
const LOADER_MIN_MS = 900;
const LOADER_BUDGET_MS = 6000;
const LOADER_FILL_MS = 450;
const LOADER_FADE_MS = 400;
const SCROLL_KEYS = new Set([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"]);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

const sourceFor = (set: HeroFilmSet): FrameSource => ({
  width: set.width,
  height: set.height,
  url: (index) => frameUrl(set, index),
});

interface ConnectionInfo {
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * Drives the hero film: maps the section's scroll position to a frame and a caption scene,
 * moves the hotspot labels, fades the bottom cards out at the end and runs the "charging"
 * loader while the opening frames load. Returns a cleanup function.
 */
export function startHeroFilm(el: HeroElements): () => void {
  const cleanups: (() => void)[] = [];
  const cleanup = () =>
    cleanups
      .splice(0)
      .reverse()
      .forEach((fn) => fn());

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.loader?.setAttribute("hidden", "");
    return cleanup;
  }

  const prefersTall = () => window.innerWidth / window.innerHeight < heroFilm.tallBelowAspect;
  let tall = prefersTall();
  const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
  const slowNetwork = Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? "");

  let player: FramePlayer;
  try {
    player = new FramePlayer(el.canvas, sourceFor(tall ? heroFilm.tall : heroFilm.wide), {
      frameCount: heroFilm.frameCount,
      decodedLimit: tall ? 14 : 10,
      prefetchAll: !slowNetwork,
      onFirstPaint: () => el.section.setAttribute("data-painted", ""),
    });
  } catch {
    // No 2D canvas: keep the opening still as a plain banner.
    el.section.setAttribute("data-static", "");
    el.loader?.setAttribute("hidden", "");
    return cleanup;
  }
  cleanups.push(() => player.destroy());

  /* ------------------------------------------------------------ geometry */
  const mobileQuery = window.matchMedia(`(max-width: ${heroFilm.mobileMaxWidth}px)`);
  let scroll = mobileQuery.matches ? heroFilm.mobile : heroFilm.desktop;
  let stageWidth = 0;
  let stageHeight = 0;

  const measure = () => {
    const box = el.canvas.getBoundingClientRect();
    stageWidth = box.width;
    stageHeight = box.height;
    scroll = mobileQuery.matches ? heroFilm.mobile : heroFilm.desktop;
    const wantTall = prefersTall();
    if (wantTall !== tall) {
      tall = wantTall;
      player.setSource(sourceFor(tall ? heroFilm.tall : heroFilm.wide));
    }
    player.resize(stageWidth, stageHeight, Math.min(window.devicePixelRatio || 1, 2));
    schedule();
  };
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(el.canvas);
  cleanups.push(() => resizeObserver.disconnect());

  /* ------------------------------------------------------------ scenes */
  let scene = -1;
  let stopScramble: (() => void) | null = null;
  cleanups.push(() => stopScramble?.());

  const showScene = (next: number) => {
    const first = scene === -1;
    scene = next;
    el.scenes.forEach((node, index) => {
      node.toggleAttribute("data-active", index === next);
      // The opening line is the page's <h1>: it stays available to assistive tech throughout.
      if (index > 0) node.setAttribute("aria-hidden", String(index !== next));
    });
    const active = el.scenes[next];
    if (el.cue && active) {
      el.cue.style.setProperty("--cue-offset", `${active.offsetHeight / 2 + 22}px`);
      if (!first) {
        stopScramble?.();
        stopScramble = scrambleText(el.cue, heroScrollCue);
      }
    }
  };

  /* ------------------------------------------------------------ hotspots & cards */
  let hotspotsShown = false;
  const updateHotspots = (progress: number) => {
    const { start, peak, end, drift } = heroHotspotTiming;
    const inWindow = !tall && progress > start && progress < end;
    if (!inWindow) {
      if (hotspotsShown) el.hotspots.forEach((node) => (node.style.opacity = "0"));
      hotspotsShown = false;
      return;
    }
    hotspotsShown = true;
    const distance = Math.abs(progress - peak) / (peak - start);
    el.hotspots.forEach((node, index) => {
      const spot = heroHotspots[index];
      if (!spot) return;
      const { x, y } = player.project(spot.x, spot.y + drift * distance);
      const fits = x > 8 && x + node.offsetWidth < stageWidth - 8 && y > 70 && y < stageHeight - 140;
      node.style.opacity = fits ? String(clamp01(1 - distance)) : "0";
      node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    });
  };

  let cardsHidden = false;
  let cardsOpacity = -1;
  const updateCards = (progress: number) => {
    const opacity = 1 - smoothstep(0.92, 1, progress);
    if (opacity === cardsOpacity) return;
    cardsOpacity = opacity;
    const hidden = opacity < 0.05;
    for (const card of el.cards) {
      card.style.opacity = String(opacity);
      if (hidden !== cardsHidden) card.toggleAttribute("inert", hidden);
    }
    cardsHidden = hidden;
  };

  /* ------------------------------------------------------------ scroll → frame */
  const lastFrame = heroFilm.frameCount - 1;
  let frame = -1;
  let raf = 0;
  const tick = () => {
    raf = 0;
    const top = el.section.getBoundingClientRect().top;
    const progress = clamp01(-top / scroll.play);
    const next = Math.min(lastFrame, Math.floor(progress * lastFrame + 1e-6));
    if (next !== frame) {
      frame = next;
      player.seek(next);
    }
    const nextScene = sceneAt(progress);
    if (nextScene !== scene) showScene(nextScene);
    updateHotspots(progress);
    updateCards(progress);
    if (process.env.NODE_ENV !== "production") {
      // Development-only probe for automated checks (stripped from production builds).
      (window as Window & { __heroFilm?: object }).__heroFilm = { frame, scene, progress, tall };
    }
  };
  function schedule() {
    if (!raf) raf = requestAnimationFrame(tick);
  }
  window.addEventListener("scroll", schedule, { passive: true });
  cleanups.push(() => {
    window.removeEventListener("scroll", schedule);
    cancelAnimationFrame(raf);
  });
  measure();

  /* ------------------------------------------------------------ cursor-following cue */
  // With a mouse, "Scroll to explore" trails the pointer (a short distance below it); on touch
  // screens it stays under the caption.
  if (el.cue && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const cue = el.cue;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let following = false;
    let followRaf = 0;
    let last = 0;
    const step = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      const ease = 1 - Math.exp(-dt * 14);
      current.x += (target.x - current.x) * ease;
      current.y += (target.y - current.y) * ease;
      cue.style.transform = `translate(${current.x.toFixed(1)}px, ${current.y.toFixed(1)}px)`;
      const settled = Math.abs(target.x - current.x) < 0.3 && Math.abs(target.y - current.y) < 0.3;
      followRaf = settled ? 0 : requestAnimationFrame(step);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const stage = el.canvas.getBoundingClientRect();
      if (stage.bottom <= 0) return;
      target.x = event.clientX - stage.left;
      target.y = event.clientY - stage.top + 28;
      if (!following) {
        following = true;
        current.x = target.x;
        current.y = target.y;
        cue.setAttribute("data-follow", "");
      }
      if (!followRaf) {
        last = performance.now();
        followRaf = requestAnimationFrame(step);
      }
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(followRaf);
      cue.removeAttribute("data-follow");
      cue.style.transform = "";
    });
  }

  /* ------------------------------------------------------------ loader */
  const loader = el.loader;
  if (loader && !loader.hidden) {
    let finished = false;
    const swallow = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    // Hold the page still while charging without hiding the scrollbar (that would shift the
    // layout at the reveal): wheel and touch stop at the loader, scrolling keys are ignored.
    const onKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) event.preventDefault();
    };
    loader.addEventListener("wheel", swallow, { passive: false });
    loader.addEventListener("touchmove", swallow, { passive: false });
    window.addEventListener("keydown", onKey, { capture: true });
    const timers: number[] = [];
    const release = () => {
      if (finished) return;
      finished = true;
      loader.removeEventListener("wheel", swallow);
      loader.removeEventListener("touchmove", swallow);
      window.removeEventListener("keydown", onKey, { capture: true });
    };
    cleanups.push(() => {
      timers.forEach((id) => window.clearTimeout(id));
      release();
    });

    const shownFor = new Promise((resolve) => timers.push(window.setTimeout(resolve, LOADER_MIN_MS)));
    const fonts = document.fonts?.ready.catch(() => undefined) ?? Promise.resolve();
    void player
      .warm(
        heroFilm.warmFrames,
        (fraction) => loader.style.setProperty("--charge", fraction.toFixed(3)),
        LOADER_BUDGET_MS,
      )
      .then(() => Promise.all([shownFor, fonts]))
      .then(() => {
        if (finished) return;
        loader.style.setProperty("--charge", "1");
        timers.push(
          window.setTimeout(() => {
            loader.setAttribute("data-state", "done");
            release();
            schedule();
          }, LOADER_FILL_MS),
          window.setTimeout(() => loader.setAttribute("hidden", ""), LOADER_FILL_MS + LOADER_FADE_MS),
        );
      });
  } else {
    void player.warm(heroFilm.warmFrames, () => {}, LOADER_BUDGET_MS);
  }

  return cleanup;
}

/**
 * Paints a numbered image sequence into a <canvas>, cover-cropped like `object-fit: cover`.
 *
 * - Frames are fetched as blobs and decoded with `createImageBitmap`, which decodes off the main
 *   thread (an <img> drawn into a canvas is re-decoded synchronously on first draw in Chrome).
 * - Encoded frames are kept (a few MB); decoded bitmaps are bounded to a window around the
 *   playhead and closed when they fall out of it.
 * - When the wanted frame isn't decoded yet the nearest decoded one stays on screen, so fast
 *   scrolls never freeze or blank the picture.
 */

export interface FrameSource {
  width: number;
  height: number;
  url: (index: number) => string;
}

export interface FramePlayerOptions {
  frameCount: number;
  /** Decoded frames kept in memory around the playhead. */
  decodedLimit: number;
  /** Fetch every frame in the background after the warm-up (off when the visitor saves data). */
  prefetchAll: boolean;
  onFirstPaint?: () => void;
}

type Decoded = ImageBitmap | HTMLImageElement;

/** Frames decoded ahead of / behind the playhead, relative to the scroll direction. */
const AHEAD = 6;
const BEHIND = 2;
/**
 * Requests in flight. Browsers allow ~6 connections per host over HTTP/1.1, so the film leaves
 * room for the page's own images and scripts; the background fill-in also runs at low priority.
 */
const FETCH_CONCURRENCY = 3;
const BACKGROUND_CONCURRENCY = 2;
const DECODE_CONCURRENCY = 3;

export class FramePlayer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly blobs = new Map<number, Blob>();
  private readonly decoded = new Map<number, Decoded>();
  private readonly decoding = new Set<number>();
  private readonly fetching = new Set<number>();
  private readonly failed = new Set<number>();
  private readonly abort = new AbortController();
  /** Network queues, in priority order: around the playhead, warm-up, then everything else. */
  private urgent: number[] = [];
  private warmQueue: number[] = [];
  private backgroundCursor = 0;
  private backgroundOn = false;
  private activeFetches = 0;
  private activeDecodes = 0;
  private target = 0;
  private painted = -1;
  private direction = 1;
  private crop = { sx: 0, sy: 0, sw: 0, sh: 0 };
  private box = { width: 0, height: 0 };
  private onLoadProgress: (() => void) | null = null;
  private destroyed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private source: FrameSource,
    private readonly options: FramePlayerOptions,
  ) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
  }

  /** Size the canvas to its box; the backing store never exceeds the visible source pixels. */
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number) {
    if (cssWidth <= 0 || cssHeight <= 0) return;
    const { width: fw, height: fh } = this.source;
    const viewAspect = cssWidth / cssHeight;
    const wider = viewAspect > fw / fh;
    const sw = wider ? fw : fh * viewAspect;
    const sh = wider ? fw / viewAspect : fh;
    this.crop = { sx: (fw - sw) / 2, sy: (fh - sh) / 2, sw, sh };
    this.box = { width: cssWidth, height: cssHeight };
    const scale = Math.min(devicePixelRatio, sw / cssWidth);
    const width = Math.max(1, Math.round(cssWidth * scale));
    const height = Math.max(1, Math.round(cssHeight * scale));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      // Resizing resets the context, so smoothing is set again afterwards.
      this.canvas.width = width;
      this.canvas.height = height;
      this.ctx.imageSmoothingQuality = "high";
    }
    if (this.painted >= 0) this.draw(this.painted);
  }

  /** Maps a point in source-frame pixels to CSS pixels inside the canvas box. */
  project(x: number, y: number) {
    const { sx, sy, sw, sh } = this.crop;
    return { x: ((x - sx) / sw) * this.box.width, y: ((y - sy) / sh) * this.box.height };
  }

  /** Swap to another cut of the same film (e.g. portrait frames after a rotation). */
  setSource(source: FrameSource) {
    if (source.url(0) === this.source.url(0)) return;
    this.source = source;
    this.blobs.clear();
    this.failed.clear();
    for (const frame of this.decoded.values()) closeFrame(frame);
    this.decoded.clear();
    this.backgroundCursor = 0;
    this.painted = -1;
    this.seek(this.target);
  }

  /**
   * Fetches the first `count` frames and decodes the first — what the loader waits for.
   * Resolves early when `budgetMs` runs out; loading simply carries on afterwards.
   */
  warm(count: number, onProgress: (fraction: number) => void, budgetMs: number) {
    const total = Math.min(count, this.options.frameCount);
    this.warmQueue = Array.from({ length: total }, (_, i) => i);
    return new Promise<void>((resolve) => {
      const timer = window.setTimeout(finish, budgetMs);
      function finish() {
        window.clearTimeout(timer);
        resolve();
      }
      this.onLoadProgress = () => {
        let ready = 0;
        for (let i = 0; i < total; i++) if (this.blobs.has(i) || this.failed.has(i)) ready++;
        const first = this.decoded.has(0) || this.painted >= 0 || this.failed.has(0) ? 1 : 0;
        onProgress((ready + first) / (total + 1));
        if (ready === total && first) finish();
      };
      this.onLoadProgress();
      this.pump();
    }).finally(() => {
      this.onLoadProgress = null;
      if (!this.options.prefetchAll) return;
      // Fill in the rest of the film once the page itself has finished loading.
      const startBackground = () => {
        this.backgroundOn = true;
        this.pump();
      };
      if (document.readyState === "complete") startBackground();
      else window.addEventListener("load", startBackground, { once: true, signal: this.abort.signal });
    });
  }

  /** Show frame `index` (or the nearest decoded one until it arrives). */
  seek(index: number) {
    const target = Math.max(0, Math.min(this.options.frameCount - 1, index));
    if (target !== this.target) this.direction = target > this.target ? 1 : -1;
    this.target = target;

    const wanted = this.window().filter((i) => !this.failed.has(i));
    this.urgent = wanted.filter((i) => !this.blobs.has(i));
    for (const i of wanted) if (this.blobs.has(i)) this.decode(i);
    this.evict();
    this.pump();

    if (this.decoded.has(target)) this.draw(target);
    else {
      const nearest = this.nearestDecoded(target);
      if (nearest !== -1 && nearest !== this.painted) this.draw(nearest);
    }
  }

  destroy() {
    this.destroyed = true;
    this.abort.abort();
    for (const frame of this.decoded.values()) closeFrame(frame);
    this.decoded.clear();
    this.blobs.clear();
  }

  /** The playhead and its neighbours, most urgent first. */
  private window() {
    const frames = [this.target];
    for (let step = 1; step <= AHEAD; step++) frames.push(this.target + step * this.direction);
    for (let step = 1; step <= BEHIND; step++) frames.push(this.target - step * this.direction);
    return frames.filter((i) => i >= 0 && i < this.options.frameCount);
  }

  private isWanted(index: number) {
    if (index === 0 && this.painted === -1) return true;
    const offset = (index - this.target) * this.direction;
    return offset >= -BEHIND && offset <= AHEAD;
  }

  private nearestDecoded(index: number) {
    let best = -1;
    let bestDistance = Infinity;
    for (const i of this.decoded.keys()) {
      // Frames behind the direction of travel read as a short pause rather than a jump back.
      const distance = Math.abs(i - index) + ((i - index) * this.direction > 0 ? 0.5 : 0);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    }
    return best;
  }

  private draw(index: number) {
    const frame = this.decoded.get(index);
    const { sx, sy, sw, sh } = this.crop;
    if (!frame || this.destroyed || sw <= 0) return;
    this.ctx.drawImage(frame, sx, sy, sw, sh, 0, 0, this.canvas.width, this.canvas.height);
    const first = this.painted === -1;
    this.painted = index;
    if (first) this.options.onFirstPaint?.();
  }

  private pump() {
    while (!this.destroyed && this.activeFetches < FETCH_CONCURRENCY) {
      const next = this.nextToFetch();
      if (!next) break;
      void this.fetchFrame(next.index, next.background);
    }
  }

  private nextToFetch(): { index: number; background: boolean } | null {
    const usable = (i: number) => !this.blobs.has(i) && !this.fetching.has(i) && !this.failed.has(i);
    for (const queue of [this.urgent, this.warmQueue]) {
      while (queue.length) {
        const index = queue.shift()!;
        if (usable(index)) return { index, background: false };
      }
    }
    if (!this.backgroundOn || this.activeFetches >= BACKGROUND_CONCURRENCY) return null;
    while (this.backgroundCursor < this.options.frameCount) {
      const index = this.backgroundCursor++;
      if (usable(index)) return { index, background: true };
    }
    return null;
  }

  private async fetchFrame(index: number, background: boolean) {
    const source = this.source;
    this.fetching.add(index);
    this.activeFetches++;
    try {
      const response = await fetch(source.url(index), {
        signal: this.abort.signal,
        priority: background ? "low" : "high",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (source !== this.source) return;
      this.blobs.set(index, blob);
      if (this.isWanted(index)) this.decode(index);
    } catch {
      if (!this.destroyed && source === this.source) this.failed.add(index);
    } finally {
      this.fetching.delete(index);
      this.activeFetches--;
      this.onLoadProgress?.();
      this.pump();
    }
  }

  private decode(index: number) {
    if (this.decoded.has(index) || this.decoding.has(index) || this.activeDecodes >= DECODE_CONCURRENCY) return;
    const blob = this.blobs.get(index);
    if (!blob) return;
    const source = this.source;
    this.decoding.add(index);
    this.activeDecodes++;
    decodeBlob(blob)
      .then((frame) => {
        if (this.destroyed || source !== this.source || !this.isWanted(index)) {
          closeFrame(frame);
          return;
        }
        this.decoded.set(index, frame);
        this.evict();
        // Paint it if it is the wanted frame, or closer to it than what is on screen.
        const closer = Math.abs(index - this.target) < Math.abs(this.painted - this.target);
        if (index === this.target || this.painted === -1 || closer) this.draw(index);
      })
      .catch(() => {
        if (source === this.source) this.failed.add(index);
      })
      .finally(() => {
        this.decoding.delete(index);
        this.activeDecodes--;
        this.onLoadProgress?.();
        // Hand the free slot to the most urgent frame still waiting.
        const next = this.window().find((i) => this.blobs.has(i) && !this.decoded.has(i) && !this.decoding.has(i));
        if (next !== undefined) this.decode(next);
      });
  }

  private evict() {
    if (this.decoded.size <= this.options.decodedLimit) return;
    const farthestFirst = [...this.decoded.keys()]
      .filter((i) => i !== this.painted)
      .sort((a, b) => Math.abs(b - this.target) - Math.abs(a - this.target));
    for (const i of farthestFirst) {
      if (this.decoded.size <= this.options.decodedLimit) break;
      closeFrame(this.decoded.get(i)!);
      this.decoded.delete(i);
    }
  }
}

function closeFrame(frame: Decoded) {
  if ("close" in frame) frame.close();
}

async function decodeBlob(blob: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") return createImageBitmap(blob);
  const image = new Image();
  const url = URL.createObjectURL(blob);
  try {
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>_-+=*";

/**
 * Briefly scrambles an element's text and resolves it left to right (the scroll cue's "glitch"
 * on every scene change). Returns a cancel function. Screen readers keep the real text via the
 * element's aria-label.
 */
export function scrambleText(element: HTMLElement, text: string, durationMs = 520) {
  let raf = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / durationMs);
    const settled = Math.floor(progress * text.length);
    let out = text.slice(0, settled);
    for (let i = settled; i < text.length; i++) {
      out += text[i] === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
    element.textContent = out;
    if (progress < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    element.textContent = text;
  };
}

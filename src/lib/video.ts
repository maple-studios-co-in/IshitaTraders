/** A video link from the admin, resolved to something the page can play inline. */
export interface Playable {
  kind: "iframe" | "video";
  src: string;
}

/**
 * Turns a link pasted in the admin into something playable inline: YouTube (watch, youtu.be,
 * shorts) and Vimeo links become their embed players; direct .mp4/.webm files play in <video>.
 */
export function toPlayable(url: string | undefined | null): Playable | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com") {
    const id =
      host === "youtu.be"
        ? parsed.pathname.slice(1)
        : (parsed.searchParams.get("v") ?? parsed.pathname.match(/\/(?:embed|shorts|live)\/([\w-]+)/)?.[1]);
    return id ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parsed.pathname.match(/(\d{6,})/)?.[1];
    return id ? { kind: "iframe", src: `https://player.vimeo.com/video/${id}?autoplay=1` } : null;
  }
  if (/\.(mp4|webm|mov)$/i.test(parsed.pathname)) return { kind: "video", src: parsed.toString() };
  return { kind: "iframe", src: parsed.toString() };
}

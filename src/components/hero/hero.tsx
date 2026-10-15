import { preload } from "react-dom";

import { getSiteSettings } from "@/admin/content/settings";
import { frameUrl, heroFilm } from "@/content/hero";

import { HeroFilm } from "./hero-film";

const TALL_MEDIA = `(max-aspect-ratio: ${Math.round(heroFilm.tallBelowAspect * 100)}/100)`;
const WIDE_MEDIA = `not all and ${TALL_MEDIA}`;

/**
 * Homepage hero — the scroll film (see hero-film.tsx). Captions and brands are editable in
 * Admin → Site content → Hero. The opening frames are preloaded for the first paint.
 */
export async function Hero() {
  const { hero } = await getSiteSettings();
  preload(frameUrl(heroFilm.wide, 0), { as: "image", fetchPriority: "high", media: WIDE_MEDIA });
  preload(frameUrl(heroFilm.tall, 0), { as: "image", fetchPriority: "high", media: TALL_MEDIA });
  return <HeroFilm scenes={hero.scenes} brands={hero.trustedBrands} />;
}

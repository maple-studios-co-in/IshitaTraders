import type { StaticImageData } from "next/image";

import brandExide from "@/assets/images/brands/exide.webp";
import brandMicrotek from "@/assets/images/brands/microtek.webp";
import brandUtl from "@/assets/images/brands/utl.webp";
import categoryBatteries from "@/assets/images/categories/batteries.webp";
import categoryElectrical from "@/assets/images/categories/electrical.webp";
import categoryInverters from "@/assets/images/categories/inverters.webp";
import categoryOnlineUps from "@/assets/images/categories/online-ups.webp";
import categorySolarInverters from "@/assets/images/categories/solar-inverters.webp";
import categorySolarPanels from "@/assets/images/categories/solar-panels.webp";
import heroSolarFarm from "@/assets/images/hero/solar-farm.webp";
import catalogueBanner from "@/assets/images/products/catalogue-banner.webp";
import catalogExideInvaMaster from "@/assets/images/products/catalog/exide-invamaster.webp";
import catalogExideIt500 from "@/assets/images/products/catalog/exide-it500.webp";
import catalogMicrotekSmartHybrid from "@/assets/images/products/catalog/microtek-smart-hybrid.webp";
import catalogUtlGammaPlus from "@/assets/images/products/catalog/utl-gamma-plus.webp";
import featuredExide from "@/assets/images/products/featured-exide.webp";
import featuredMicrotek from "@/assets/images/products/featured-microtek.webp";
import featuredUtl from "@/assets/images/products/featured-utl.webp";
import avatarAjay from "@/assets/images/testimonials/ajay-kumar-singh.webp";
import avatarAlok from "@/assets/images/testimonials/alok-kumar-verma.webp";
import avatarMamta from "@/assets/images/testimonials/mamta-verma.webp";

/**
 * Images bundled with the site. Content stored in the database refers to them by key, so the
 * originals keep their build-time optimisation (blur placeholders, hashed URLs) and can always be
 * restored from the admin's image picker.
 */
export const staticImages = {
  "hero/solar-farm": { image: heroSolarFarm, label: "Hero — solar farm" },
  "products/catalogue-banner": { image: catalogueBanner, label: "Products page banner" },
  "categories/solar-panels": { image: categorySolarPanels, label: "Category — solar panels" },
  "categories/solar-inverters": { image: categorySolarInverters, label: "Category — solar inverters" },
  "categories/inverters": { image: categoryInverters, label: "Category — inverters" },
  "categories/batteries": { image: categoryBatteries, label: "Category — batteries" },
  "categories/online-ups": { image: categoryOnlineUps, label: "Category — online UPS" },
  "categories/electrical": { image: categoryElectrical, label: "Category — electrical" },
  "products/featured-utl": { image: featuredUtl, label: "UTL lithium-ion battery" },
  "products/featured-exide": { image: featuredExide, label: "Exide tubular battery" },
  "products/featured-microtek": { image: featuredMicrotek, label: "Microtek LFP battery" },
  "products/catalog/exide-it500": { image: catalogExideIt500, label: "Exide IT500 battery" },
  "products/catalog/exide-invamaster": { image: catalogExideInvaMaster, label: "Exide InvaMaster battery" },
  "products/catalog/utl-gamma-plus": { image: catalogUtlGammaPlus, label: "UTL Gamma+ inverter" },
  "products/catalog/microtek-smart-hybrid": { image: catalogMicrotekSmartHybrid, label: "Microtek Smart Hybrid" },
  "brands/exide": { image: brandExide, label: "Exide logo" },
  "brands/utl": { image: brandUtl, label: "UTL Solar logo" },
  "brands/microtek": { image: brandMicrotek, label: "Microtek logo" },
  "testimonials/mamta-verma": { image: avatarMamta, label: "Avatar — Mamta Verma" },
  "testimonials/ajay-kumar-singh": { image: avatarAjay, label: "Avatar — Ajay Kumar Singh" },
  "testimonials/alok-kumar-verma": { image: avatarAlok, label: "Avatar — Dr. Alok Kumar Verma" },
} satisfies Record<string, { image: StaticImageData; label: string }>;

export type StaticImageKey = keyof typeof staticImages;

export const staticImageKeys = Object.keys(staticImages) as StaticImageKey[];

export function isStaticImageKey(key: string): key is StaticImageKey {
  return Object.hasOwn(staticImages, key);
}

/** A bundled image or an uploaded one. Stored as JSON in the database. */
export type ImageRef =
  | { kind: "static"; key: StaticImageKey; alt: string }
  | {
      kind: "media";
      id: string;
      url: string;
      width: number | null;
      height: number | null;
      blurDataUrl: string | null;
      alt: string;
    };

/** An uploaded document (e.g. a product datasheet PDF). */
export interface FileRef {
  mediaId: string;
  url: string;
  name: string;
  size: number;
}

export interface ResolvedImage {
  src: StaticImageData | string;
  alt: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
  placeholder: "blur" | "empty";
}

/** Turns a stored reference into props for `next/image`. */
export function resolveImage(ref: ImageRef | null | undefined, fallbackAlt = ""): ResolvedImage | null {
  if (!ref) return null;
  const alt = ref.alt || fallbackAlt;
  if (ref.kind === "static") {
    const entry = isStaticImageKey(ref.key) ? staticImages[ref.key] : null;
    if (!entry) return null;
    return { src: entry.image, alt, placeholder: entry.image.blurDataURL ? "blur" : "empty" };
  }
  return {
    src: ref.url,
    alt,
    width: ref.width ?? undefined,
    height: ref.height ?? undefined,
    blurDataURL: ref.blurDataUrl ?? undefined,
    placeholder: ref.blurDataUrl ? "blur" : "empty",
  };
}

/** A plain URL for the image (for metadata, JSON-LD and the admin's thumbnails). */
export function imageUrl(ref: ImageRef | null | undefined): string | null {
  if (!ref) return null;
  if (ref.kind === "media") return ref.url;
  return isStaticImageKey(ref.key) ? staticImages[ref.key].image.src : null;
}

export const staticImage = (key: StaticImageKey, alt: string): ImageRef => ({ kind: "static", key, alt });

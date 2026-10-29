export type SocialPlatform = "facebook" | "linkedin" | "x" | "instagram";

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  href: string;
}

const director = { honorific: "Er.", name: "Amit Kumar" } as const;

/**
 * The site's public address: canonical links, sitemap, robots.txt, social previews, links in alert
 * emails. NEXT_PUBLIC_SITE_URL is read at build time, so a production build without it (outside
 * Vercel) stops here rather than publishing localhost links. Errors are raised on the server only.
 */
function resolveSiteUrl() {
  const onServer = typeof window === "undefined";
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    if (
      onServer &&
      !/^https?:\/\/[^/\s]+\.[^/\s]+/.test(explicit) &&
      !/^http:\/\/localhost(:\d+)?\/?$/.test(explicit)
    ) {
      throw new Error(
        `NEXT_PUBLIC_SITE_URL must be a full address such as https://www.example.com (got "${explicit}").`,
      );
    }
    return explicit.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  if (onServer && process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Add it to the hosting environment variables (e.g. NEXT_PUBLIC_SITE_URL=https://www.example.com) and build again.",
    );
  }
  return "http://localhost:3070";
}

export const siteConfig = {
  name: "Ishita Traders",
  shortName: "Ishita Traders",
  tagline: "Battery | Inverter | Solar",
  title: "Ishita Traders — Solar, Inverters & Batteries in Chakia, Bihar",
  description:
    "Authorised UTL, Exide and Microtek distributor in Chakia, East Champaran. Solar panels, solar inverters, inverter batteries, online UPS and turnkey solar installations for homes, businesses and institutions across Bihar since 2014.",
  url: resolveSiteUrl(),
  foundedYear: 2014,
  phone: {
    display: "7352405030",
    href: "tel:+917352405030",
    e164: "+917352405030",
  },
  whatsapp: {
    number: "917352405030",
    defaultMessage: "Hi Ishita Traders, I would like to know more about your solar and power backup solutions.",
  },
  email: "ishitatraders2014@gmail.com",
  address: {
    locality: "Chakia",
    district: "East Champaran",
    region: "Bihar",
    postalCode: "845412",
    country: "IN",
    display: "Chakia, East Champaran, Bihar, India - 845412",
  },
  director: {
    ...director,
    /** The name as shown on the site, honorific included. */
    displayName: `${director.honorific} ${director.name}`,
    title: "Director, Ishita Traders",
  },
  brands: ["UTL Solar", "Exide Industries", "Microtek"],
  /** Footer icons always show (as in the design); each becomes a link once its profile URL is filled in. */
  socials: [
    { platform: "facebook", label: "Ishita Traders on Facebook", href: "" },
    { platform: "linkedin", label: "Ishita Traders on LinkedIn", href: "" },
    { platform: "x", label: "Ishita Traders on X", href: "" },
    { platform: "instagram", label: "Ishita Traders on Instagram", href: "" },
  ] as SocialLink[],
  /** Optional YouTube/Vimeo embed URL for the "solar system video tour" button. */
  solarTourVideoUrl: process.env.NEXT_PUBLIC_SOLAR_TOUR_VIDEO_URL || undefined,
} as const;

export type SiteConfig = typeof siteConfig;

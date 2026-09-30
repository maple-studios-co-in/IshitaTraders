export type SocialPlatform = "facebook" | "linkedin" | "x" | "instagram";

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  href: string;
}

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
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
    name: "Mr. Amit Kumar",
    title: "Director, Ishita Traders",
  },
  brands: ["UTL Solar", "Exide Industries", "Microtek"],
  /** Add profile URLs here; only entries with an href are rendered in the footer. */
  socials: [] as SocialLink[],
  /** Optional YouTube/Vimeo embed URL for the "solar system video tour" button. */
  solarTourVideoUrl: process.env.NEXT_PUBLIC_SOLAR_TOUR_VIDEO_URL || undefined,
} as const;

export type SiteConfig = typeof siteConfig;

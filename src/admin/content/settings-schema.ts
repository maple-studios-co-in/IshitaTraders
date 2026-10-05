import { z } from "zod";

import { siteConfig } from "@/config/site";

import { staticImage, type FileRef, type ImageRef } from "./images";

/**
 * Everything the owner may need to change over time without a developer: business facts,
 * contact channels, social links, homepage hero, announcement bar, SEO and notifications.
 * Each section is one JSON row in the `settings` table; anything missing falls back to these
 * defaults, which mirror the site as it was designed.
 */

const line = (max = 200) => z.string().trim().max(max);
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), "Enter a full URL starting with https://");

export const imageRefSchema = z.union([
  z.object({ kind: z.literal("static"), key: z.string().min(1), alt: line(200) }),
  z.object({
    kind: z.literal("media"),
    id: z.string().min(1),
    url: z.string().min(1),
    width: z.number().int().nullable(),
    height: z.number().int().nullable(),
    blurDataUrl: z.string().nullable(),
    alt: line(200),
  }),
]) as unknown as z.ZodType<ImageRef>;

export const fileRefSchema = z.object({
  mediaId: z.string().min(1),
  url: z.string().min(1),
  name: z.string().max(200),
  size: z.number().int().nonnegative(),
}) satisfies z.ZodType<FileRef>;

/* ---------------------------------------------------------------- schemas */

export const businessSchema = z.object({
  name: line(80).min(1, "Enter the business name."),
  tagline: line(80),
  foundedYear: z.coerce.number().int().min(1900).max(2100),
  footerBlurb: line(400),
  copyright: line(200),
  director: z.object({
    honorific: line(10),
    name: line(80).min(1, "Enter the director's name."),
    title: line(120),
  }),
  address: z.object({
    locality: line(80),
    district: line(80),
    region: line(80),
    postalCode: line(12),
    country: line(2),
    display: line(200).min(1, "Enter the address as it should appear on the site."),
  }),
  mapUrl: optionalUrl,
  businessHours: line(120),
});

export const contactSchema = z.object({
  phoneDisplay: line(30).min(6, "Enter the phone number as visitors should see it."),
  phoneE164: line(20).regex(/^\+\d{8,15}$/, "Use international format, e.g. +917352405030."),
  whatsappNumber: line(20).regex(/^\d{8,15}$/, "Digits only with country code, e.g. 917352405030."),
  whatsappMessage: line(300),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
});

export const socialSchema = z.object({
  facebook: optionalUrl,
  linkedin: optionalUrl,
  x: optionalUrl,
  instagram: optionalUrl,
  youtube: optionalUrl,
});

export const heroSchema = z.object({
  eyebrow: line(60),
  established: line(40),
  titleLines: z.array(line(60)).min(1).max(3),
  description: line(400),
  trustedBrandsLabel: line(40),
  trustedBrands: z.array(line(30)).max(8),
  image: imageRefSchema,
  helpQuestion: line(120),
  helpLabel: line(120),
});

export const announcementSchema = z.object({
  enabled: z.boolean(),
  text: line(180),
  linkLabel: line(40),
  linkUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => v === "" || v.startsWith("/") || v.startsWith("#") || /^https?:\/\//i.test(v),
      "Use a path (/products), an anchor (#contact) or a full URL.",
    ),
  tone: z.enum(["navy", "leaf", "brand"]),
});

export const seoSchema = z.object({
  title: line(70).min(10, "Use at least 10 characters."),
  titleTemplate: line(70).refine((v) => v.includes("%s"), "Must contain %s where the page title goes."),
  description: line(320).min(50, "Write at least 50 characters."),
  keywords: z.array(line(60)).max(30),
  ogImage: imageRefSchema.nullable(),
  allowIndexing: z.boolean(),
  googleVerification: line(120),
  bingVerification: line(120),
  gaMeasurementId: line(20).refine((v) => v === "" || /^G-[A-Z0-9]{4,}$/.test(v), "Looks like G-XXXXXXX."),
});

export const notificationsSchema = z.object({
  enquiryEmails: z.array(z.string().trim().toLowerCase().pipe(z.email("Invalid email address."))).max(10),
  messageEmails: z.boolean(),
});

export const catalogueSchema = z.object({
  bannerImage: imageRefSchema,
  ctaLabel: line(40),
  searchPlaceholder: line(80),
  trustBadges: z.array(z.object({ title: line(30), subtitle: line(40) })).max(4),
  rfqTitle: line(80),
  rfqSubtitle: line(200),
  datasheetNote: line(80),
});

export const homepageSchema = z.object({
  solarTourVideoUrl: optionalUrl,
});

export const settingsSchemas = {
  business: businessSchema,
  contact: contactSchema,
  social: socialSchema,
  hero: heroSchema,
  announcement: announcementSchema,
  seo: seoSchema,
  notifications: notificationsSchema,
  catalogue: catalogueSchema,
  homepage: homepageSchema,
};

export type SettingsKey = keyof typeof settingsSchemas;
export type SiteSettings = { [K in SettingsKey]: z.infer<(typeof settingsSchemas)[K]> };
export const settingsKeys = Object.keys(settingsSchemas) as SettingsKey[];

/* --------------------------------------------------------------- defaults */

export const defaultSettings: SiteSettings = {
  business: {
    name: siteConfig.name,
    tagline: "Battery | Inverter | Solar",
    foundedYear: siteConfig.foundedYear,
    footerBlurb:
      "Distributor and turnkey power solutions provider, serving primarily Champaran and across Bihar since 2014.",
    copyright: "© Ishita Traders. All Rights Reserved. Estd. 2014, Chakia, East Champaran, Bihar.",
    director: {
      honorific: siteConfig.director.honorific,
      name: siteConfig.director.name,
      title: siteConfig.director.title,
    },
    address: {
      locality: siteConfig.address.locality,
      district: siteConfig.address.district,
      region: siteConfig.address.region,
      postalCode: siteConfig.address.postalCode,
      country: siteConfig.address.country,
      display: siteConfig.address.display,
    },
    mapUrl: "",
    businessHours: "",
  },
  contact: {
    phoneDisplay: siteConfig.phone.display,
    phoneE164: siteConfig.phone.e164,
    whatsappNumber: siteConfig.whatsapp.number,
    whatsappMessage: siteConfig.whatsapp.defaultMessage,
    email: siteConfig.email,
  },
  social: { facebook: "", linkedin: "", x: "", instagram: "", youtube: "" },
  hero: {
    eyebrow: "Ishita Traders",
    established: "Estd. 2014",
    titleLines: ["Reliable Power.", "Smarter Solar."],
    description:
      "Solar • Inverters • Batteries • Electrical Solutions. Trusted products and power solutions for homes, businesses and institutions.",
    trustedBrandsLabel: "Trusted Brands:",
    trustedBrands: ["UTL", "EXIDE", "MICROTEK"],
    image: staticImage("hero/solar-farm", "Rows of solar panels installed across a village landscape in Bihar"),
    helpQuestion: "Need help choosing the right product?",
    helpLabel: "Call our Chakia technical desk:",
  },
  announcement: { enabled: false, text: "", linkLabel: "", linkUrl: "", tone: "navy" },
  seo: {
    title: siteConfig.title,
    titleTemplate: `%s | ${siteConfig.name}`,
    description: siteConfig.description,
    keywords: [
      "Ishita Traders",
      "solar panels Chakia",
      "solar installation East Champaran",
      "UTL solar dealer Bihar",
      "Exide inverter battery",
      "Microtek UPS",
      "PM Surya Ghar Muft Bijli Yojana vendor",
      "inverter battery Motihari",
    ],
    ogImage: null,
    allowIndexing: true,
    googleVerification: "",
    bingVerification: "",
    gaMeasurementId: "",
  },
  notifications: { enquiryEmails: [siteConfig.email], messageEmails: false },
  catalogue: {
    bannerImage: staticImage(
      "products/catalogue-banner",
      "Exide, Microtek and UTL inverters, batteries and solar panels",
    ),
    ctaLabel: "Get Dealer Price",
    searchPlaceholder: "Search models, Ah rating…",
    trustBadges: [
      { title: "100% OEM", subtitle: "Original Stock" },
      { title: "Dispatch", subtitle: "Immediate Depot" },
      { title: "Warranty", subtitle: "National OEM" },
    ],
    rfqTitle: "Direct Institutional Enquiry / RFQ",
    rfqSubtitle: "Submit project details directly to Ishita Traders’ commercial sales desk.",
    datasheetNote: "Includes CAD drawings & pinout",
  },
  homepage: { solarTourVideoUrl: siteConfig.solarTourVideoUrl ?? "" },
};

/** Merges a stored (possibly partial or outdated) section over its defaults, one level deep. */
export function mergeSection<K extends SettingsKey>(key: K, stored: unknown): SiteSettings[K] {
  const fallback = defaultSettings[key];
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return fallback;
  const merged: Record<string, unknown> = { ...fallback };
  for (const [field, value] of Object.entries(stored as Record<string, unknown>)) {
    const base = (fallback as Record<string, unknown>)[field];
    merged[field] =
      base && value && typeof base === "object" && typeof value === "object" && !Array.isArray(base)
        ? { ...(base as object), ...(value as object) }
        : value;
  }
  const parsed = settingsSchemas[key].safeParse(merged);
  return parsed.success ? (parsed.data as SiteSettings[K]) : fallback;
}

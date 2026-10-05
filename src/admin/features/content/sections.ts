import type { SettingsKey } from "@/admin/content/settings-schema";

/** The editable sections of Admin → Site content, in menu order (client-safe). */
export const contentSections = [
  {
    key: "business",
    label: "Business profile",
    description: "Name, tagline, director, address, footer text and opening hours.",
  },
  {
    key: "contact",
    label: "Phone, WhatsApp & email",
    description: "Used by every call, WhatsApp and email button on the site.",
  },
  {
    key: "social",
    label: "Social media links",
    description: "The icons in the footer. Empty links stay as plain icons.",
  },
  {
    key: "hero",
    label: "Homepage hero banner",
    description: "The first screen of the homepage: headline, text, image and brands.",
  },
  {
    key: "announcement",
    label: "Announcement bar",
    description: "An optional strip above the header for offers and notices.",
  },
  {
    key: "catalogue",
    label: "Products page",
    description: "Banner image, button text, trust badges and the RFQ form headings.",
  },
  { key: "homepage", label: "Homepage video", description: "The solar installation video behind the play button." },
  { key: "notifications", label: "Email alerts", description: "Who gets an email for each new enquiry." },
] as const satisfies { key: Exclude<SettingsKey, "seo">; label: string; description: string }[];

export type ContentSectionKey = (typeof contentSections)[number]["key"];

export const sectionLabel = (key: SettingsKey) =>
  key === "seo" ? "SEO settings" : (contentSections.find((section) => section.key === key)?.label ?? key);

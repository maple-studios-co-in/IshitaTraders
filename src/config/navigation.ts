/** Section anchors on the home page. Keep ids and links in sync through this map. */
export const sectionIds = {
  home: "top",
  brands: "brands",
  products: "products",
  about: "about",
  featured: "featured-products",
  contact: "contact",
  solar: "solar-solutions",
  whyUs: "why-us",
  installations: "installations",
  solarRange: "solar-range",
  testimonials: "testimonials",
  director: "director-message",
  faq: "faq",
} as const;

export type SectionId = (typeof sectionIds)[keyof typeof sectionIds];

export const anchor = (id: SectionId) => `#${id}` as const;

export interface NavItem {
  label: string;
  sectionId: SectionId;
}

export const mainNav: NavItem[] = [
  { label: "Home", sectionId: sectionIds.home },
  { label: "Products", sectionId: sectionIds.products },
  { label: "Solar Solutions", sectionId: sectionIds.solar },
  { label: "Brands", sectionId: sectionIds.brands },
  { label: "About Us", sectionId: sectionIds.about },
  { label: "Our Clients", sectionId: sectionIds.testimonials },
  { label: "Contact", sectionId: sectionIds.contact },
];

/**
 * Destinations for "view products" style CTAs. The dedicated products page is not built yet,
 * so these point at the on-page catalogue; switch them to real routes once it exists.
 */
export const productLinks = {
  all: anchor(sectionIds.products),
  featured: anchor(sectionIds.featured),
  solarRange: anchor(sectionIds.solarRange),
} as const;

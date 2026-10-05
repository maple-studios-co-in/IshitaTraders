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
  /** Homepage section that highlights this item while it's being read. */
  sectionId: SectionId;
  /** A separate page this item opens instead of scrolling to its section. */
  href?: string;
}

export const mainNav: NavItem[] = [
  { label: "Home", sectionId: sectionIds.home },
  { label: "Products", sectionId: sectionIds.products, href: "/products" },
  { label: "Brands", sectionId: sectionIds.brands },
  { label: "About Us", sectionId: sectionIds.about },
  { label: "Our Clients", sectionId: sectionIds.testimonials },
  { label: "Contact", sectionId: sectionIds.contact },
];

/** Where a nav item points: its own page, or its homepage section (absolute when off the homepage). */
export function navHref(item: NavItem, onHomepage: boolean) {
  if (item.href) return item.href;
  return onHomepage ? anchor(item.sectionId) : item.sectionId === sectionIds.home ? "/" : `/${anchor(item.sectionId)}`;
}

/** Destinations for "view products" style CTAs. */
export const productLinks = {
  all: "/products",
  brand: (slug: string) => `/products?brand=${encodeURIComponent(slug)}`,
  featured: anchor(sectionIds.featured),
  solarRange: anchor(sectionIds.solarRange),
} as const;

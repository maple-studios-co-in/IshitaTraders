/** Section anchors on the home page. Keep ids and links in sync through this map. */
export const sectionIds = {
  home: "top",
  about: "about",
  calculator: "calculator",
  service: "service",
  products: "products",
  solar: "solar",
  inverters: "inverters",
  batteries: "batteries",
  electrical: "electrical",
  customers: "customers",
  applications: "applications",
  residential: "residential",
  commercial: "commercial",
  institutional: "institutional",
  director: "director",
  brands: "brands",
  faq: "faq",
  contact: "contact",
} as const;

export type SectionId = (typeof sectionIds)[keyof typeof sectionIds];

export const anchor = (id: SectionId) => `#${id}` as const;

export interface NavLink {
  label: string;
  /** Homepage section this link scrolls to (and that highlights it while it's being read). */
  sectionId: SectionId;
  /** A separate page this link opens instead of scrolling to its section. */
  href?: string;
}

export interface NavItem extends NavLink {
  /** Shown as a dropdown on wide screens and as a nested list in the menu. */
  children?: NavLink[];
}

export const mainNav: NavItem[] = [
  { label: "Home", sectionId: sectionIds.home },
  {
    label: "Products",
    sectionId: sectionIds.products,
    children: [
      { label: "Solar panels", sectionId: sectionIds.solar },
      { label: "Inverters", sectionId: sectionIds.inverters },
      { label: "Batteries", sectionId: sectionIds.batteries },
      { label: "UPS & electrical", sectionId: sectionIds.electrical },
      { label: "Full catalogue", sectionId: sectionIds.products, href: "/products" },
    ],
  },
  {
    label: "Solutions",
    sectionId: sectionIds.applications,
    children: [
      { label: "Residential", sectionId: sectionIds.residential },
      { label: "Commercial", sectionId: sectionIds.commercial },
      { label: "Institutional", sectionId: sectionIds.institutional },
    ],
  },
  { label: "Company", sectionId: sectionIds.about },
  { label: "Calculator", sectionId: sectionIds.calculator },
  { label: "FAQs", sectionId: sectionIds.faq },
];

/** The design's badge on a dropdown pill ("Products 4"): how many homepage sections it lists. */
export const navCount = (item: NavItem) => item.children?.filter((child) => !child.href).length ?? 0;

export const contactNav: NavLink = { label: "Contact us", sectionId: sectionIds.contact };

/** Where a nav link points: its own page, or its homepage section (absolute when off the homepage). */
export function navHref(link: NavLink, onHomepage: boolean) {
  if (link.href) return link.href;
  if (onHomepage) return anchor(link.sectionId);
  return link.sectionId === sectionIds.home ? "/" : `/${anchor(link.sectionId)}`;
}

/** Destinations for "view products" style CTAs. */
export const productLinks = {
  all: "/products",
  brand: (slug: string) => `/products?brand=${encodeURIComponent(slug)}`,
  /** The catalogue narrowed to one or more categories (by slug). */
  categories: (slugs: readonly string[]) => `/products?category=${slugs.map(encodeURIComponent).join(",")}`,
} as const;

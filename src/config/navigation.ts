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

/** The website's own pages. */
export const pageLinks = {
  home: "/",
  products: "/products",
  brands: "/brands",
  clients: "/clients",
  contact: "/contact",
} as const;

export interface NavItem {
  label: string;
  /** A page this item opens (it stays lit on that page and the pages below it)… */
  href?: string;
  /** …or the homepage section it scrolls to (lit while that section is being read). */
  sectionId?: SectionId;
  /** Opens the Products mega menu on wide screens. */
  megaMenu?: boolean;
}

export const mainNav: NavItem[] = [
  { label: "Home", sectionId: sectionIds.home },
  { label: "Products", href: pageLinks.products, megaMenu: true },
  { label: "Brands", href: pageLinks.brands },
  { label: "About Us", sectionId: sectionIds.about },
  { label: "Our Clients", href: pageLinks.clients },
];

/** The last item, drawn as the button at the end of the navigation. */
export const contactNav: NavItem = { label: "Contact", href: pageLinks.contact };

/** Every link of the navigation, in order (footer quick links, phone menu). */
export const allNavLinks: NavItem[] = [...mainNav, contactNav];

/** Where a nav item points: its page, or its homepage section (absolute when off the homepage). */
export function navHref(item: NavItem, onHomepage: boolean) {
  if (item.href) return item.href;
  const id = item.sectionId ?? sectionIds.home;
  if (onHomepage) return anchor(id);
  return id === sectionIds.home ? "/" : `/${anchor(id)}`;
}

/** Destinations for "view products" style CTAs. */
export const productLinks = {
  all: pageLinks.products,
  brand: (slug: string) => `/products?brand=${encodeURIComponent(slug)}`,
  /** The catalogue narrowed to one or more categories (by slug). */
  categories: (slugs: readonly string[]) => `/products?category=${slugs.map(encodeURIComponent).join(",")}`,
  featured: anchor(sectionIds.featured),
  solarRange: anchor(sectionIds.solarRange),
} as const;

/** "Get a quote" style links: the form in place on pages that have one (home, contact), else the contact page. */
export const quoteHref = (formOnPage: boolean) => (formOnPage ? anchor(sectionIds.contact) : pageLinks.contact);

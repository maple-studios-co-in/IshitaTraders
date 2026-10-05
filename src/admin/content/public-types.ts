import type { FileRef, ImageRef } from "./images";
import type { ProductSpec, StockStatus, TestimonialBadge } from "./types";

/** Shapes the public website consumes (client-safe, serialisable). */

export interface PublicBrand {
  id: string;
  slug: string;
  name: string;
  tabLabel: string;
  logo: ImageRef | null;
}

export interface PublicCategory {
  id: string;
  slug: string;
  name: string;
  label: string;
  description: string;
  image: ImageRef | null;
  enquirySubject: string;
  showOnHomepage: boolean;
}

export interface PublicProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  brand: { slug: string; name: string } | null;
  category: { slug: string; name: string } | null;
  typeLabel: string;
  subtitle: string;
  badge: string;
  summary: string;
  description: string;
  image: ImageRef | null;
  gallery: ImageRef[];
  specs: ProductSpec[];
  applications: string[];
  price: { mrp: number | null; price: number | null; note: string; show: boolean };
  stockStatus: StockStatus;
  warranty: string;
  datasheet: FileRef | null;
  isFeatured: boolean;
  /** Optional overrides for the product page's title and description. */
  seo: { title: string; description: string };
}

export interface Catalog {
  brands: PublicBrand[];
  categories: PublicCategory[];
  products: PublicProduct[];
}

export interface PublicTestimonial {
  id: string;
  name: string;
  location: string;
  quote: string;
  rating: number;
  badge: { kind: TestimonialBadge; label: string };
  avatar: ImageRef | null;
  isSample: boolean;
}

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
}

/** The specs shown on a product card: highlighted ones first, at most four. */
export function cardSpecs(product: Pick<PublicProduct, "specs">) {
  const highlighted = product.specs.filter((spec) => spec.highlight);
  return (highlighted.length > 0 ? highlighted : product.specs).slice(0, 4);
}

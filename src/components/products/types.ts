import type { ResolvedImage } from "@/admin/content/images";
import type { SiteSettings } from "@/admin/content/settings-schema";
import type { ProductSpec, StockStatus } from "@/admin/content/types";

/**
 * What the products page hands to its client components: the published catalogue with images
 * already resolved and prices already formatted on the server, so the browser bundle stays small.
 */
export interface CatalogueProduct {
  slug: string;
  sku: string;
  name: string;
  /** `short` is the first word of the brand name ("UTL" for "UTL Solar"), used on chips. */
  brand: { slug: string; name: string; short: string } | null;
  category: string;
  typeLabel: string;
  subtitle: string;
  badge: string;
  summary: string;
  description: string;
  image: ResolvedImage | null;
  gallery: ResolvedImage[];
  /** Highlighted specs (max four) for the card's 2×2 grid. */
  cardSpecs: ProductSpec[];
  specs: ProductSpec[];
  applications: string[];
  /** Present only when the admin chose to show a price. */
  price: { amount: string; value: number; mrp: string | null; note: string } | null;
  stockStatus: StockStatus;
  warranty: string;
  datasheet: { url: string; name: string; size: string } | null;
}

export interface CatalogueBrand {
  slug: string;
  name: string;
  tabLabel: string;
}

export type CatalogueCopy = SiteSettings["catalogue"];
export type CatalogueContact = SiteSettings["contact"];

export interface CatalogueProps {
  products: CatalogueProduct[];
  brands: CatalogueBrand[];
  applications: string[];
  copy: Omit<CatalogueCopy, "bannerImage">;
  contact: CatalogueContact;
}

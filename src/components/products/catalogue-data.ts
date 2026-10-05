import "server-only";

import { resolveImage, type ResolvedImage } from "@/admin/content/images";
import { cardSpecs, type Catalog, type PublicProduct } from "@/admin/content/public-types";

import type { CatalogueBrand, CatalogueProduct } from "./types";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const formatInr = (value: number) => inr.format(value);

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}

/** Shapes one published product for the catalogue's client components. */
export function toCatalogueProduct(product: PublicProduct): CatalogueProduct {
  const { price } = product;
  const showPrice = price.show && price.price !== null;
  return {
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    brand: product.brand
      ? {
          slug: product.brand.slug,
          name: product.brand.name,
          short: product.brand.name.split(" ")[0] ?? product.brand.name,
        }
      : null,
    category: product.category?.name ?? "",
    typeLabel: product.typeLabel,
    subtitle: product.subtitle,
    badge: product.badge.trim(),
    summary: product.summary,
    description: product.description,
    image: resolveImage(product.image, product.name),
    gallery: product.gallery
      .map((ref, index) => resolveImage(ref, `${product.name} — view ${index + 2}`))
      .filter((image): image is ResolvedImage => image !== null),
    cardSpecs: cardSpecs(product),
    specs: product.specs,
    applications: product.applications,
    price:
      showPrice && price.price !== null
        ? {
            amount: formatInr(price.price),
            value: price.price,
            mrp: price.mrp !== null && price.mrp > price.price ? formatInr(price.mrp) : null,
            note: price.note.trim(),
          }
        : null,
    stockStatus: product.stockStatus,
    warranty: product.warranty.trim(),
    datasheet: product.datasheet
      ? { url: product.datasheet.url, name: product.datasheet.name, size: formatFileSize(product.datasheet.size) }
      : null,
  };
}

export function toCatalogueBrands(catalog: Catalog): CatalogueBrand[] {
  return catalog.brands.map(({ slug, name, tabLabel }) => ({ slug, name, tabLabel }));
}

/** Every application tagged on a published product, de-duplicated (case-insensitively) and sorted. */
export function catalogueApplications(products: PublicProduct[]) {
  const unique = new Map<string, string>();
  for (const application of products.flatMap((product) => product.applications)) {
    const label = application.trim();
    if (label && !unique.has(label.toLowerCase())) unique.set(label.toLowerCase(), label);
  }
  return [...unique.values()].sort((a, b) => a.localeCompare(b, "en-IN"));
}

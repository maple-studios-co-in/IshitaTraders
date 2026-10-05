import type { ProductFormValues } from "./product-form";
import type { ProductRow } from "./queries";

/** Only what the edit form needs, as plain serialisable values. */
export function toFormValues(row: ProductRow): ProductFormValues {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    brandId: row.brandId,
    categoryId: row.categoryId,
    typeLabel: row.typeLabel,
    subtitle: row.subtitle,
    badge: row.badge,
    summary: row.summary,
    description: row.description,
    image: row.image,
    gallery: row.gallery,
    specs: row.specs,
    applications: row.applications,
    mrp: row.mrp,
    price: row.price,
    priceNote: row.priceNote,
    showPrice: row.showPrice,
    stockStatus: row.stockStatus,
    warranty: row.warranty,
    datasheet: row.datasheet,
    isPublished: row.isPublished,
    isFeatured: row.isFeatured,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    updatedAt: row.updatedAt.toISOString(),
  };
}

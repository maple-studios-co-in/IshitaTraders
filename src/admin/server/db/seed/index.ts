import "server-only";

import { eq } from "drizzle-orm";

import { staticImage } from "@/admin/content/images";

import type { Database } from "../client";
import { brands, categories, faqs, products, settings, testimonials } from "../schema";
import { seedBrands, seedCategories, seedProducts } from "./catalog";
import { seedFaqs, seedTestimonials } from "./content";

const SEED_MARKER = "__seed";
const SEED_VERSION = 1;

/**
 * Fills a fresh database with the site's current content, exactly once. The marker row is
 * inserted in the same transaction, so concurrent first requests can't seed twice.
 * Settings are not seeded: missing sections fall back to code defaults.
 */
export async function seedIfEmpty(db: Database) {
  const existing = await db.select({ key: settings.key }).from(settings).where(eq(settings.key, SEED_MARKER));
  if (existing.length > 0) return;

  await db.transaction(async (tx) => {
    const claimed = await tx
      .insert(settings)
      .values({ key: SEED_MARKER, value: { version: SEED_VERSION, seededAt: new Date().toISOString() } })
      .onConflictDoNothing()
      .returning({ key: settings.key });
    if (claimed.length === 0) return;

    const brandRows = await tx
      .insert(brands)
      .values(seedBrands.map((brand, index) => ({ ...brand, sortOrder: index })))
      .returning({ id: brands.id, slug: brands.slug });
    const brandIds = new Map(brandRows.map((row) => [row.slug, row.id]));

    const categoryRows = await tx
      .insert(categories)
      .values(seedCategories.map((category, index) => ({ ...category, sortOrder: index, showOnHomepage: true })))
      .returning({ id: categories.id, slug: categories.slug });
    const categoryIds = new Map(categoryRows.map((row) => [row.slug, row.id]));

    await tx.insert(products).values(
      seedProducts.map((product, index) => ({
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        brandId: brandIds.get(product.brand) ?? null,
        categoryId: categoryIds.get(product.category) ?? null,
        typeLabel: product.typeLabel,
        subtitle: product.subtitle,
        badge: product.badge,
        summary: product.summary,
        description: product.description,
        image: staticImage(product.image.key, product.image.alt),
        specs: product.specs,
        applications: product.applications,
        warranty: product.warranty,
        stockStatus: product.stockStatus ?? "in_stock",
        isFeatured: product.featured ?? false,
        isPublished: true,
        sortOrder: index,
      })),
    );

    await tx.insert(testimonials).values(seedTestimonials.map((item, index) => ({ ...item, sortOrder: index })));
    await tx.insert(faqs).values(seedFaqs.map((item, index) => ({ ...item, sortOrder: index, isPublished: true })));
  });
}

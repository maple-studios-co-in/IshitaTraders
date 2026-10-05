import "server-only";

import { asc, count } from "drizzle-orm";

import { getDb } from "@/admin/server/db/client";
import { brands, categories, products } from "@/admin/server/db/schema";

/** Brands and categories with how many products use each. */
export async function getCatalogueTaxonomy() {
  const db = await getDb();
  const [brandRows, categoryRows, byBrand, byCategory] = await Promise.all([
    db.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.name)),
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select({ id: products.brandId, total: count() }).from(products).groupBy(products.brandId),
    db.select({ id: products.categoryId, total: count() }).from(products).groupBy(products.categoryId),
  ]);
  const brandCounts = new Map(byBrand.map((row) => [row.id ?? "", row.total]));
  const categoryCounts = new Map(byCategory.map((row) => [row.id ?? "", row.total]));
  return {
    brands: brandRows.map((row) => ({ ...row, productCount: brandCounts.get(row.id) ?? 0 })),
    categories: categoryRows.map((row) => ({ ...row, productCount: categoryCounts.get(row.id) ?? 0 })),
  };
}

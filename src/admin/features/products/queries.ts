import "server-only";

import { and, asc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";

import { stockStatuses, type StockStatus } from "@/admin/content/types";
import { getDb } from "@/admin/server/db/client";
import { brands, categories, products } from "@/admin/server/db/schema";
import { likePattern } from "@/admin/server/query";

export type ProductRow = typeof products.$inferSelect;

export interface ProductFilters {
  q?: string;
  brand?: string;
  category?: string;
  status?: string;
  stock?: string;
}

/** Products for the admin list, in website order, with their brand and category names. */
export async function listAdminProducts(filters: ProductFilters) {
  const db = await getDb();
  const where: SQL[] = [];
  if (filters.q) {
    const pattern = likePattern(filters.q);
    where.push(
      or(
        ilike(products.name, pattern),
        ilike(products.sku, pattern),
        ilike(products.subtitle, pattern),
        ilike(products.typeLabel, pattern),
        sql`${products.specs}::text ilike ${pattern}`,
      )!,
    );
  }
  if (filters.brand === "none") where.push(isNull(products.brandId));
  else if (filters.brand) where.push(eq(products.brandId, filters.brand));
  if (filters.category === "none") where.push(isNull(products.categoryId));
  else if (filters.category) where.push(eq(products.categoryId, filters.category));
  if (filters.status === "published") where.push(eq(products.isPublished, true));
  if (filters.status === "hidden") where.push(eq(products.isPublished, false));
  if (filters.status === "featured") where.push(eq(products.isFeatured, true));
  if (filters.status === "no-price") where.push(isNull(products.price));
  if (filters.stock && stockStatuses.includes(filters.stock as StockStatus))
    where.push(eq(products.stockStatus, filters.stock as StockStatus));

  return db
    .select({
      id: products.id,
      slug: products.slug,
      sku: products.sku,
      name: products.name,
      subtitle: products.subtitle,
      image: products.image,
      mrp: products.mrp,
      price: products.price,
      showPrice: products.showPrice,
      stockStatus: products.stockStatus,
      isPublished: products.isPublished,
      isFeatured: products.isFeatured,
      updatedAt: products.updatedAt,
      brandName: brands.name,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(products.sortOrder), asc(products.name));
}

export async function getAdminProduct(id: string): Promise<ProductRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return row ?? null;
}

export async function getCatalogOptions() {
  const db = await getDb();
  const [brandRows, categoryRows, applicationRows] = await Promise.all([
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.sortOrder), asc(brands.name)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select({ applications: products.applications }).from(products),
  ]);
  const applications = [...new Set(applicationRows.flatMap((row) => row.applications))].sort((a, b) =>
    a.localeCompare(b),
  );
  return { brands: brandRows, categories: categoryRows, applications };
}

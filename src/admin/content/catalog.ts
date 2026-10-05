import "server-only";

import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { cacheTags } from "@/admin/server/cache";
import { getDb } from "@/admin/server/db/client";
import { brands, categories, products } from "@/admin/server/db/schema";
import { seedBrands, seedCategories, seedProducts } from "@/admin/server/db/seed/catalog";

import { reportContentFallback } from "./fallback";
import { staticImage } from "./images";
import type { Catalog, PublicProduct } from "./public-types";

const loadCatalog = unstable_cache(
  async (): Promise<Catalog> => {
    const db = await getDb();
    const [brandRows, categoryRows, productRows] = await Promise.all([
      db.select().from(brands).orderBy(asc(brands.sortOrder), asc(brands.name)),
      db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
      db
        .select()
        .from(products)
        .where(eq(products.isPublished, true))
        .orderBy(asc(products.sortOrder), asc(products.name)),
    ]);
    const brandById = new Map(brandRows.map((row) => [row.id, row]));
    const categoryById = new Map(categoryRows.map((row) => [row.id, row]));

    return {
      brands: brandRows
        .filter((row) => row.isActive)
        .map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          tabLabel: row.tabLabel || `${row.name} Catalogue`,
          logo: row.logo,
        })),
      categories: categoryRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        label: row.label,
        description: row.description,
        image: row.image,
        enquirySubject: row.enquirySubject || row.name.toLowerCase(),
        showOnHomepage: row.showOnHomepage,
      })),
      products: productRows.map((row): PublicProduct => {
        const brand = row.brandId ? brandById.get(row.brandId) : undefined;
        const category = row.categoryId ? categoryById.get(row.categoryId) : undefined;
        return {
          id: row.id,
          slug: row.slug,
          sku: row.sku,
          name: row.name,
          brand: brand ? { slug: brand.slug, name: brand.name } : null,
          category: category ? { slug: category.slug, name: category.name } : null,
          typeLabel: row.typeLabel,
          subtitle: row.subtitle,
          badge: row.badge,
          summary: row.summary,
          description: row.description,
          image: row.image,
          gallery: row.gallery,
          specs: row.specs,
          applications: row.applications,
          price: { mrp: row.mrp, price: row.price, note: row.priceNote, show: row.showPrice },
          stockStatus: row.stockStatus,
          warranty: row.warranty,
          datasheet: row.datasheet,
          isFeatured: row.isFeatured,
          seo: { title: row.seoTitle, description: row.seoDescription },
        };
      }),
    };
  },
  ["catalog:v2"],
  { tags: [cacheTags.catalog], revalidate: 3600 },
);

/** Published catalogue for the website (cached, refreshed on every admin change). */
export const getCatalog = cache(async (): Promise<Catalog> => {
  try {
    return await loadCatalog();
  } catch (error) {
    reportContentFallback("catalog", error);
    return builtInCatalog();
  }
});

/** The seed catalogue, used when no database is reachable. */
function builtInCatalog(): Catalog {
  const brandBySlug = new Map(seedBrands.map((brand) => [brand.slug, brand]));
  const categoryBySlug = new Map(seedCategories.map((category) => [category.slug, category]));
  return {
    brands: seedBrands.map((brand) => ({
      id: `seed:${brand.slug}`,
      slug: brand.slug,
      name: brand.name,
      tabLabel: brand.tabLabel,
      logo: brand.logo,
    })),
    categories: seedCategories.map((category) => ({
      id: `seed:${category.slug}`,
      slug: category.slug,
      name: category.name,
      label: category.label,
      description: category.description,
      image: category.image,
      enquirySubject: category.enquirySubject,
      showOnHomepage: true,
    })),
    products: seedProducts.map((product) => {
      const brand = brandBySlug.get(product.brand);
      const category = categoryBySlug.get(product.category);
      return {
        id: `seed:${product.slug}`,
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        brand: brand ? { slug: brand.slug, name: brand.name } : null,
        category: category ? { slug: category.slug, name: category.name } : null,
        typeLabel: product.typeLabel,
        subtitle: product.subtitle,
        badge: product.badge,
        summary: product.summary,
        description: product.description,
        image: staticImage(product.image.key, product.image.alt),
        gallery: [],
        specs: product.specs,
        applications: product.applications,
        price: { mrp: null, price: null, note: "", show: false },
        stockStatus: product.stockStatus ?? "in_stock",
        warranty: product.warranty,
        datasheet: null,
        isFeatured: product.featured ?? false,
        seo: { title: "", description: "" },
      };
    }),
  };
}

import type { MetadataRoute } from "next";

import { getCatalog } from "@/admin/content/catalog";
import { getRoutingTable } from "@/admin/content/content";
import { getSiteSettings } from "@/admin/content/settings";
import { siteConfig } from "@/config/site";

/**
 * The home page, the catalogue, every published product page and every published HTML page that may be indexed. Cached and
 * rebuilt whenever pages or settings change (their cache tags). With indexing switched off in
 * Admin → SEO, only the home page is listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ seo }, routing, catalog] = await Promise.all([getSiteSettings(), getRoutingTable(), getCatalog()]);
  const home: MetadataRoute.Sitemap[number] = { url: siteConfig.url, changeFrequency: "weekly", priority: 1 };
  if (!seo.allowIndexing) return [home];

  const pages = routing.pages
    .filter((page) => !page.noindex)
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((page) => ({
      url: `${siteConfig.url}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  const products = catalog.products.map((product) => ({
    url: `${siteConfig.url}/products/${encodeURIComponent(product.slug)}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [home, { url: `${siteConfig.url}/products`, changeFrequency: "weekly", priority: 0.9 }, ...products, ...pages];
}

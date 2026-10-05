import type { MetadataRoute } from "next";

import { getSiteSettings } from "@/admin/content/settings";
import { siteConfig } from "@/config/site";

/**
 * The admin and the API are never crawled. With indexing switched off in Admin → SEO (e.g. while
 * the site is being prepared), search engines are asked to skip the whole site.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { seo } = await getSiteSettings();
  if (!seo.allowIndexing) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}

import type { MetadataRoute } from "next";

import { getSiteSettings } from "@/admin/content/settings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { business, seo } = await getSiteSettings();
  return {
    name: business.name,
    short_name: business.name,
    description: seo.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e3a8a",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

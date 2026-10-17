import type { Metadata } from "next";

import { imageUrl } from "@/admin/content/images";
import { getSiteSettings } from "@/admin/content/settings";

/**
 * Metadata for an inner page: title, description, canonical and the share card. A page-level
 * `openGraph` replaces the root layout's whole block, so the shared fields are restated here.
 */
export async function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Promise<Metadata> {
  const { seo, business } = await getSiteSettings();
  const socialTitle = seo.titleTemplate.replace("%s", title);
  const ogImage = seo.ogImage
    ? { url: imageUrl(seo.ogImage) ?? "/og.jpg", alt: seo.ogImage.alt || seo.title }
    : { url: "/og.jpg", width: 1200, height: 630, alt: seo.title };

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: business.name,
      url: path,
      title: socialTitle,
      description,
      images: [ogImage],
    },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: [ogImage.url] },
  };
}

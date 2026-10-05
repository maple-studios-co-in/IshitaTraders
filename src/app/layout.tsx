import type { Metadata, Viewport } from "next";
import { Inter, Jost, Outfit, Plus_Jakarta_Sans } from "next/font/google";

import { imageUrl } from "@/admin/content/images";
import { getSiteSettings } from "@/admin/content/settings";
import { siteConfig } from "@/config/site";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
// Display faces used by single sections below the fold — not preloaded.
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-outfit-face",
  display: "swap",
  preload: false,
});
const jost = Jost({ subsets: ["latin"], variable: "--font-jost-face", display: "swap", preload: false });

/** Site-wide SEO defaults, editable in Admin → SEO. Pages add their own title and canonical URL. */
export async function generateMetadata(): Promise<Metadata> {
  const { seo, business } = await getSiteSettings();
  const ogImage = seo.ogImage
    ? { url: imageUrl(seo.ogImage) ?? "/og.jpg", alt: seo.ogImage.alt || seo.title }
    : { url: "/og.jpg", width: 1200, height: 630, alt: "Ishita Traders — Reliable Power. Smarter Solar." };

  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: seo.title, template: seo.titleTemplate },
    description: seo.description,
    applicationName: business.name,
    keywords: seo.keywords,
    authors: [{ name: business.name }],
    creator: business.name,
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: business.name,
      title: seo.title,
      description: seo.description,
      images: [ogImage],
    },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: [ogImage.url] },
    robots: seo.allowIndexing ? { index: true, follow: true } : { index: false, follow: false },
    verification: {
      google: seo.googleVerification || undefined,
      other: seo.bingVerification ? { "msvalidate.01": seo.bingVerification } : undefined,
    },
    formatDetection: { telephone: true, email: true, address: true },
    category: "business",
  };
}

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${jakarta.variable} ${outfit.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter, Jost, Outfit, Plus_Jakarta_Sans } from "next/font/google";

import { MotionProvider } from "@/components/providers/motion-provider";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "Ishita Traders",
    "solar panels Chakia",
    "solar installation East Champaran",
    "UTL solar dealer Bihar",
    "Exide inverter battery",
    "Microtek UPS",
    "PM Surya Ghar Muft Bijli Yojana vendor",
    "inverter battery Motihari",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Ishita Traders — Reliable Power. Smarter Solar." }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true, email: true, address: true },
  category: "business",
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${jakarta.variable} ${outfit.variable} ${jost.variable}`}>
      <body>
        <a
          href="#main-content"
          className="fixed top-3 left-3 z-100 -translate-y-24 rounded-md bg-navy-800 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <MotionProvider>{children}</MotionProvider>
        <SmoothScroll />
      </body>
    </html>
  );
}

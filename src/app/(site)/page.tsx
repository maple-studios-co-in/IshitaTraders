import type { Metadata } from "next";

import { getCatalog } from "@/admin/content/catalog";
import { imageUrl } from "@/admin/content/images";
import { getSiteSettings } from "@/admin/content/settings";
import type { SiteSettings } from "@/admin/content/settings-schema";
import { AboutIntro } from "@/components/home/about-intro";
import { Applications } from "@/components/home/applications";
import { ContactSection } from "@/components/home/contact-section";
import { CustomerStories } from "@/components/home/customer-stories";
import { DirectorWord } from "@/components/home/director-word";
import { EverydayEnergy } from "@/components/home/everyday-energy";
import { LocalService } from "@/components/home/local-service";
import { ProductLineup } from "@/components/home/product-lineup";
import { Questions } from "@/components/home/questions";
import { SavingsCalculator } from "@/components/home/savings-calculator";
import { TrustedBrands } from "@/components/home/trusted-brands";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Hero } from "@/components/hero/hero";
import { siteConfig } from "@/config/site";

// Only the canonical here: a page-level `openGraph` would replace the root layout's whole block (image included).
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Rebuilt hourly at most; admin changes refresh it immediately through cache tags. */
export const revalidate = 3600;

function StructuredData({ settings, brands }: { settings: SiteSettings; brands: string[] }) {
  const { business, contact, seo, social } = settings;
  const data = {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    "@id": `${siteConfig.url}/#business`,
    name: business.name,
    description: seo.description,
    url: siteConfig.url,
    logo: `${siteConfig.url}/icon.png`,
    image: new URL(imageUrl(seo.ogImage) ?? "/og.jpg", siteConfig.url).toString(),
    telephone: contact.phoneE164,
    email: contact.email,
    foundingDate: String(business.foundedYear),
    address: {
      "@type": "PostalAddress",
      addressLocality: business.address.locality,
      addressRegion: business.address.region,
      postalCode: business.address.postalCode,
      addressCountry: business.address.country,
    },
    areaServed: { "@type": "State", name: business.address.region || "Bihar" },
    brand: brands.map((name) => ({ "@type": "Brand", name })),
    founder: {
      "@type": "Person",
      honorificPrefix: business.director.honorific || undefined,
      name: business.director.name,
      jobTitle: business.director.title || "Director",
    },
    sameAs: Object.values(social).filter(Boolean),
    knowsAbout: ["Solar panels", "Solar inverters", "Inverter batteries", "Online UPS", "Rooftop solar installation"],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped for "<" so it can't break out of the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** Figma coBLUmSDJE5yrXgsWcbpCF, "Desktop / 1440 px" and "Mobile / 390 px", top to bottom. */
export default async function HomePage() {
  const [settings, catalog] = await Promise.all([getSiteSettings(), getCatalog()]);
  const { business, hero } = settings;
  const liveCategories = new Set(
    catalog.products.map((product) => product.category?.slug).filter((slug): slug is string => Boolean(slug)),
  );
  const director = [business.director.honorific, business.director.name].filter(Boolean).join(" ");

  return (
    <>
      <StructuredData settings={settings} brands={catalog.brands.map((brand) => brand.name)} />
      <SiteHeader contact={settings.contact} businessName={business.name} overHero />
      <main id="main-content" tabIndex={-1} data-page-content className="font-archivo outline-none">
        <Hero />
        {/* Slides up over the hero film's last frame (see .hero-film in globals.css). */}
        <div data-hero-cover className="relative bg-white shadow-[0_-28px_60px_-24px_rgb(0_0_0/0.45)]">
          <AboutIntro
            facts={{
              locality: business.address.locality || "Chakia",
              region: business.address.region || "Bihar",
              foundedYear: String(business.foundedYear),
            }}
          />
          <SavingsCalculator />
          <LocalService />
          <EverydayEnergy />
          <ProductLineup liveCategories={liveCategories} />
          <CustomerStories />
          <Applications />
          <DirectorWord signature={director ? `${director}, ${business.name}` : business.name} />
          <TrustedBrands names={hero.trustedBrands} catalogueBrands={catalog.brands} />
          <Questions structuredData />
          <ContactSection />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

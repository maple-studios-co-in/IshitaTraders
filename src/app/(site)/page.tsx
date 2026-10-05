import type { Metadata } from "next";

import { getCatalog } from "@/admin/content/catalog";
import { imageUrl } from "@/admin/content/images";
import { contactLinks, resolveLink } from "@/admin/content/links";
import { getSiteSettings } from "@/admin/content/settings";
import type { SiteSettings } from "@/admin/content/settings-schema";
import { FinalCta, SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { About } from "@/components/sections/about";
import { BrandPartners } from "@/components/sections/brand-partners";
import { Contact } from "@/components/sections/contact";
import { DirectorMessage } from "@/components/sections/director-message";
import { Faq } from "@/components/sections/faq";
import { FeaturedProducts } from "@/components/sections/featured-products";
import { Hero } from "@/components/sections/hero";
import { Installations } from "@/components/sections/installations";
import { ProductCategories } from "@/components/sections/product-categories";
import { ProductShowcase } from "@/components/sections/product-showcase";
import { SolarHomeBanner, SolarSolutions } from "@/components/sections/solar-solutions";
import { SunlightToElectricity } from "@/components/sections/sunlight-to-electricity";
import { Testimonials } from "@/components/sections/testimonials";
import { WhyChooseUs } from "@/components/sections/why-choose-us";
import { siteConfig } from "@/config/site";
import { showcaseSlides } from "@/content/home";

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

export default async function HomePage() {
  const [settings, catalog] = await Promise.all([getSiteSettings(), getCatalog()]);
  const links = contactLinks(settings.contact);
  const slides = showcaseSlides.map((slide) => ({
    ...slide,
    cta: { ...slide.cta, href: resolveLink(slide.cta.href, links) },
  }));

  return (
    <>
      <StructuredData settings={settings} brands={catalog.brands.map((brand) => brand.name)} />
      <SiteHeader contact={settings.contact} businessName={settings.business.name} />
      <main id="main-content" tabIndex={-1} data-page-content className="outline-none">
        <Hero />
        <BrandPartners />
        <ProductCategories />
        <About />
        <FeaturedProducts />
        <Contact />
        <SolarSolutions />
        <SolarHomeBanner />
        <WhyChooseUs />
        <Installations />
        <SunlightToElectricity />
        <ProductShowcase slides={slides} />
        <Testimonials />
        <DirectorMessage />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

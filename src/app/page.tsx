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

function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "ElectronicsStore",
    "@id": `${siteConfig.url}/#business`,
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    logo: `${siteConfig.url}/icon.png`,
    image: `${siteConfig.url}/og.jpg`,
    telephone: siteConfig.phone.e164,
    email: siteConfig.email,
    foundingDate: String(siteConfig.foundedYear),
    address: {
      "@type": "PostalAddress",
      addressLocality: siteConfig.address.locality,
      addressRegion: siteConfig.address.region,
      postalCode: siteConfig.address.postalCode,
      addressCountry: siteConfig.address.country,
    },
    areaServed: { "@type": "State", name: "Bihar" },
    brand: siteConfig.brands.map((name) => ({ "@type": "Brand", name })),
    founder: { "@type": "Person", name: siteConfig.director.name.replace(/^Mr\.\s*/, ""), jobTitle: "Director" },
    sameAs: siteConfig.socials.map((social) => social.href).filter(Boolean),
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

export default function HomePage() {
  return (
    <>
      <StructuredData />
      <SiteHeader />
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
        <ProductShowcase slides={showcaseSlides} />
        <Testimonials />
        <DirectorMessage />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}

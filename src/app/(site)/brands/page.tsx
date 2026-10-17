import { getSiteSettings } from "@/admin/content/settings";
import { FinalCta, SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { BrandBlocks, BrandsIntro, WhyBuyDirect } from "@/components/pages/brands";
import { PageBanner } from "@/components/pages/page-banner";
import { Faq } from "@/components/sections/faq";
import { pageLinks } from "@/config/navigation";
import { pageMetadata } from "@/lib/page-metadata";

/** Rebuilt hourly at most; admin changes refresh it immediately through cache tags. */
export const revalidate = 3600;

export async function generateMetadata() {
  const { business } = await getSiteSettings();
  return pageMetadata({
    title: "Brands",
    description: `${business.name} is an authorised dealer for UTL Solar, Exide and Microtek: genuine solar panels, inverters, batteries and UPS with full manufacturer warranty, local installation and service.`,
    path: pageLinks.brands,
  });
}

export default async function BrandsPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <SiteHeader contact={settings.contact} businessName={settings.business.name} />
      <main id="main-content" tabIndex={-1} data-page-content className="outline-none">
        <PageBanner title="Brands" id="page-title" />
        <BrandsIntro />
        <BrandBlocks />
        <WhyBuyDirect />
        <Faq />
        <FinalCta onHomepage={false} />
      </main>
      <SiteFooter onHomepage={false} />
    </>
  );
}

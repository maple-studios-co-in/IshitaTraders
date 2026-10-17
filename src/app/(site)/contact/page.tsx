import { getSiteSettings } from "@/admin/content/settings";
import { FinalCta, SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ContactBenefits, ContactSection } from "@/components/pages/contact";
import { PageBanner } from "@/components/pages/page-banner";
import { Faq } from "@/components/sections/faq";
import { pageLinks } from "@/config/navigation";
import { contactPage } from "@/content/contact-page";
import { pageMetadata } from "@/lib/page-metadata";

/** Rebuilt hourly at most; admin changes refresh it immediately through cache tags. */
export const revalidate = 3600;

export async function generateMetadata() {
  const { business, contact } = await getSiteSettings();
  return pageMetadata({
    title: "Contact Us",
    description: `Call ${contact.phoneDisplay}, WhatsApp or send an enquiry to ${business.name}, ${business.address.display}, for solar, battery, inverter, UPS and bulk supply.`,
    path: pageLinks.contact,
  });
}

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <SiteHeader contact={settings.contact} businessName={settings.business.name} />
      <main id="main-content" tabIndex={-1} data-page-content className="outline-none">
        <PageBanner title={contactPage.banner} id="page-title" />
        <ContactSection contact={settings.contact} business={settings.business} />
        <ContactBenefits />
        <Faq />
        <FinalCta onHomepage={false} formOnPage />
      </main>
      <SiteFooter onHomepage={false} />
    </>
  );
}

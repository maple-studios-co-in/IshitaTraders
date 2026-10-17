import { getTestimonials } from "@/admin/content/content";
import { getSiteSettings } from "@/admin/content/settings";
import { FinalCta, SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ClientReviews, FeaturedStory, Industries, VideoStories } from "@/components/pages/clients";
import { PageBanner } from "@/components/pages/page-banner";
import { Faq } from "@/components/sections/faq";
import { pageLinks } from "@/config/navigation";
import { pageMetadata } from "@/lib/page-metadata";

/** Rebuilt hourly at most; admin changes refresh it immediately through cache tags. */
export const revalidate = 3600;

export async function generateMetadata() {
  const { business } = await getSiteSettings();
  return pageMetadata({
    title: "Our Clients",
    description: `Homes, hospitals, banks, petrol pumps, schools and offices across ${business.address.district || "East Champaran"} rely on ${business.name} for solar, inverter, battery and UPS solutions. Read their reviews and watch their stories.`,
    path: pageLinks.clients,
  });
}

export default async function ClientsPage() {
  const [settings, testimonials] = await Promise.all([getSiteSettings(), getTestimonials()]);
  const { homepage } = settings;

  return (
    <>
      <SiteHeader contact={settings.contact} businessName={settings.business.name} />
      <main id="main-content" tabIndex={-1} data-page-content className="outline-none">
        <PageBanner title="Our Clients" id="page-title" />
        <FeaturedStory video={{ url: homepage.clientStoryVideoUrl, length: homepage.clientStoryVideoLength }} />
        <Industries />
        <ClientReviews items={testimonials} />
        <VideoStories
          videos={[
            { url: homepage.clientVideo1Url, length: homepage.clientVideo1Length },
            { url: homepage.clientVideo2Url, length: homepage.clientVideo2Length },
            { url: homepage.clientVideo3Url, length: homepage.clientVideo3Length },
          ]}
          channelUrl={settings.social.youtube}
        />
        <Faq />
        <FinalCta onHomepage={false} />
      </main>
      <SiteFooter onHomepage={false} />
    </>
  );
}

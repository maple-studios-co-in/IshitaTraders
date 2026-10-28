import { contactLinks } from "@/admin/content/links";
import { getSiteSettings } from "@/admin/content/settings";
import { AnnouncementBar } from "@/admin/site/announcement-bar";
import { GoogleAnalytics } from "@/admin/site/google-analytics";
import { LeadTracker } from "@/admin/site/lead-tracker";
import { MobileDock } from "@/components/layout/mobile-dock";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { MotionProvider } from "@/components/providers/motion-provider";
import { SmoothScroll } from "@/components/providers/smooth-scroll";

/**
 * Public website shell: smooth scrolling, motion, announcement bar, the floating WhatsApp button,
 * contact-click tracking.
 */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { announcement, seo, contact, business } = await getSiteSettings();
  const links = contactLinks(contact);
  return (
    <>
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-100 -translate-y-24 rounded-md bg-navy-800 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <AnnouncementBar announcement={announcement} />
      <MotionProvider>{children}</MotionProvider>
      <MobileDock phoneHref={links.phone} phoneDisplay={contact.phoneDisplay} whatsappHref={links.whatsapp()} />
      {/* After the dock: globals.css lifts the button above it with a sibling selector. */}
      <WhatsAppFloat contact={contact} businessName={business.name} />
      <SmoothScroll />
      <LeadTracker />
      {seo.gaMeasurementId ? <GoogleAnalytics measurementId={seo.gaMeasurementId} /> : null}
    </>
  );
}

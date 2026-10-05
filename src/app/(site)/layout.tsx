import { getSiteSettings } from "@/admin/content/settings";
import { AnnouncementBar } from "@/admin/site/announcement-bar";
import { GoogleAnalytics } from "@/admin/site/google-analytics";
import { LeadTracker } from "@/admin/site/lead-tracker";
import { MotionProvider } from "@/components/providers/motion-provider";
import { SmoothScroll } from "@/components/providers/smooth-scroll";

/** Public website shell: smooth scrolling, motion, announcement bar, contact-click tracking. */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { announcement, seo } = await getSiteSettings();
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
      <SmoothScroll />
      <LeadTracker />
      {seo.gaMeasurementId ? <GoogleAnalytics measurementId={seo.gaMeasurementId} /> : null}
    </>
  );
}

import type { SiteSettings } from "@/admin/content/settings-schema";
import { SmartLink } from "@/components/ui/smart-link";
import { cn } from "@/lib/cn";

const tones = {
  navy: "bg-navy-900 text-white",
  leaf: "bg-leaf-600 text-white",
  brand: "bg-brand-600 text-white",
};

/** Optional site-wide strip above the header (Admin → Site content → Announcement bar). */
export function AnnouncementBar({ announcement }: { announcement: SiteSettings["announcement"] }) {
  if (!announcement.enabled || !announcement.text) return null;
  return (
    <div
      data-track-context="announcement"
      className={cn("relative z-[51] px-4 py-2 text-center text-sm", tones[announcement.tone])}
    >
      <p className="container-site flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="font-medium">{announcement.text}</span>
        {announcement.linkUrl && announcement.linkLabel ? (
          <SmartLink
            href={announcement.linkUrl}
            className="font-bold underline decoration-white/50 underline-offset-4 hover:decoration-white"
          >
            {announcement.linkLabel} →
          </SmartLink>
        ) : null}
      </p>
    </div>
  );
}

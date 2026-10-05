import { Code, FileWarning, Globe, Image as ImageIcon, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Card, CardHeader } from "@/admin/components/ui/primitives";

/** What to expect from a hosted page: shown beside the page form. */
export function HostingNotes() {
  const items = [
    {
      icon: Globe,
      title: "Hosted exactly as uploaded",
      body: "The page opens at its own address on this website. The site’s header, footer and analytics aren’t added — what you upload is what visitors see.",
    },
    {
      icon: ShieldCheck,
      title: "Scripts run in a sandbox",
      body: "JavaScript, forms and pop-ups work, but the page can’t read this website’s cookies or saved data, or act on your admin account. Scripts that rely on cookies or local storage may not work.",
    },
    {
      icon: Code,
      title: "External files work",
      body: "CSS, JavaScript, fonts and images loaded from full https:// links (CDNs, Google Fonts) work normally.",
    },
    {
      icon: ImageIcon,
      title: "Relative paths won’t",
      body: (
        <>
          Only the single .html file is hosted, so links like{" "}
          <code className="rounded bg-slate-100 px-1">images/offer.jpg</code> won’t load. Upload images to the{" "}
          <Link href="/admin/media" className="font-semibold text-navy-800 underline-offset-2 hover:underline">
            Media library
          </Link>{" "}
          (or any image host) and use their full https:// address.
        </>
      ),
    },
    {
      icon: FileWarning,
      title: "One file, up to 2 MB",
      body: "Changes reach every visitor within a few minutes. Older versions are kept, so an edit can always be undone.",
    },
  ];

  return (
    <Card>
      <CardHeader title="How hosted pages work" />
      <ul className="flex flex-col gap-4 p-5">
        {items.map((item) => (
          <li key={item.title} className="flex gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface text-navy-800 [&_svg]:size-4">
              <item.icon aria-hidden="true" />
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-slate-800">{item.title}</p>
              <p className="mt-0.5 leading-relaxed text-slate-600">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

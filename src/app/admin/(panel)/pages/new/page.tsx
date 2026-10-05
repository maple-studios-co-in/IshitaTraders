import type { Metadata } from "next";

import { PageHeader } from "@/admin/components/ui/primitives";
import { HostingNotes } from "@/admin/features/pages/hosting-notes";
import { PageForm } from "@/admin/features/pages/page-form";
import { requirePermission } from "@/admin/server/auth/guard";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "New HTML page" };

export default async function NewPagePage() {
  await requirePermission("pages:write");
  return (
    <>
      <PageHeader
        title="New HTML page"
        description="Upload an .html file or paste its code. Save it as a draft to preview it before it goes live."
        breadcrumbs={[{ label: "Website" }, { label: "HTML pages", href: "/admin/pages" }, { label: "New page" }]}
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <PageForm siteUrl={siteConfig.url} />
        <div className="xl:sticky xl:top-24">
          <HostingNotes />
        </div>
      </div>
    </>
  );
}

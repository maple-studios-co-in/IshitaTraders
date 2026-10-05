import { eq } from "drizzle-orm";
import { ExternalLink, FileSearch, Gauge, Map as MapIcon, Signpost } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/admin/components/ui/button";
import { Badge, Card, CardHeader, PageHeader } from "@/admin/components/ui/primitives";
import { mergeSection } from "@/admin/content/settings-schema";
import { SeoForm } from "@/admin/features/content/settings-forms";
import { getLastAuditReport } from "@/admin/features/seo/audit-store";
import { scoreLabel } from "@/admin/features/seo/audit-types";
import { formatDateTime } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { settings } from "@/admin/server/db/schema";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "SEO & audit" };

export default async function SeoPage() {
  await requirePermission("seo:write");
  const db = await getDb();
  const [[row], report] = await Promise.all([
    db.select({ value: settings.value }).from(settings).where(eq(settings.key, "seo")),
    getLastAuditReport().catch(() => null),
  ]);
  const score = report?.score ?? null;
  const ranAt = report?.finishedAt ?? null;

  return (
    <>
      <PageHeader
        title="SEO & audit"
        description="How the site appears in Google and when shared on WhatsApp or social media — plus a health check that finds problems for you."
        breadcrumbs={[{ label: "Growth" }, { label: "SEO & audit" }]}
        actions={
          <ButtonLink href="/admin/seo/audit">
            <Gauge aria-hidden="true" /> Run SEO audit
          </ButtonLink>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader
            title="Search & sharing settings"
            description="Applies to the whole site. Products and pages can override their own title and description."
          />
          <div className="p-5">
            <SeoForm values={mergeSection("seo", row?.value)} isCustomised={Boolean(row)} siteUrl={siteConfig.url} />
          </div>
        </Card>

        <aside className="flex flex-col gap-6 xl:sticky xl:top-24">
          <Card>
            <CardHeader title="Site health" />
            <div className="flex flex-col gap-3 p-5">
              {score !== null ? (
                <>
                  <p className="font-display text-4xl font-extrabold text-navy-950">
                    {score}
                    <span className="text-lg text-slate-400">/100</span>
                  </p>
                  <Badge tone={score >= 90 ? "leaf" : score >= 70 ? "amber" : "red"}>{scoreLabel(score)}</Badge>
                  {ranAt ? (
                    <p className="text-xs text-slate-500">
                      Last audit {formatDateTime(ranAt)} · {report?.counts.error ?? 0} errors ·{" "}
                      {report?.counts.warning ?? 0} warnings
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  No audit yet. Run one to check titles, descriptions, images, links, structured data and speed basics
                  on every page.
                </p>
              )}
              <Link
                href="/admin/seo/audit"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
              >
                <FileSearch className="size-4" aria-hidden="true" /> Open the audit
              </Link>
            </div>
          </Card>
          <Card>
            <CardHeader title="For search engines" />
            <ul className="flex flex-col gap-1 p-3 text-sm">
              {[
                { href: "/sitemap.xml", label: "Sitemap (sitemap.xml)", icon: MapIcon },
                { href: "/robots.txt", label: "Robots rules (robots.txt)", icon: FileSearch },
              ].map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-2 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-navy-900"
                  >
                    <item.icon className="size-4 text-slate-400" aria-hidden="true" /> {item.label}{" "}
                    <ExternalLink className="ml-auto size-3.5 text-slate-400" aria-hidden="true" />
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/admin/redirects"
                  className="flex items-center gap-2 rounded-lg px-2 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-navy-900"
                >
                  <Signpost className="size-4 text-slate-400" aria-hidden="true" /> Redirects for moved pages
                </Link>
              </li>
            </ul>
            <p className="border-t border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500">
              Submit the sitemap once in Google Search Console (verify with the code on the left) so new products are
              found faster.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}

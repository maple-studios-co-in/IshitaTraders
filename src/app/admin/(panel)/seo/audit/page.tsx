import { ScanSearch, Settings2 } from "lucide-react";
import type { Metadata } from "next";

import { ButtonLink } from "@/admin/components/ui/button";
import { param } from "@/admin/components/ui/listing";
import { Card, EmptyState, PageHeader } from "@/admin/components/ui/primitives";
import { AuditReportView, SeverityLegend } from "@/admin/features/seo/audit-report";
import { getLastAuditReport } from "@/admin/features/seo/audit-store";
import { isAuditCategory } from "@/admin/features/seo/audit-types";
import { RunAuditButton } from "@/admin/features/seo/run-audit-button";
import { formatDateTime } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";

export const metadata: Metadata = { title: "SEO audit" };

/** The audit (a Server Action on this page) crawls the site for up to ~25 seconds. */
export const maxDuration = 60;

export default async function SeoAuditPage({ searchParams }: PageProps<"/admin/seo/audit">) {
  await requirePermission("seo:write");
  const [params, report] = await Promise.all([searchParams, getLastAuditReport()]);
  const category = param(params, "category");
  const active = isAuditCategory(category) ? category : null;

  return (
    <>
      <PageHeader
        title="SEO audit"
        description="Checks the live pages the way a search engine reads them — titles, descriptions, headings, links, sitemap, structured data — plus the products, reviews and settings you manage here."
        breadcrumbs={[{ label: "Growth" }, { label: "SEO & audit", href: "/admin/seo" }, { label: "Audit" }]}
        actions={
          <>
            <ButtonLink href="/admin/seo" variant="secondary">
              <Settings2 aria-hidden="true" /> SEO settings
            </ButtonLink>
            {report ? (
              <RunAuditButton label="Run again" hint={`Last run ${formatDateTime(report.finishedAt)}`} />
            ) : null}
          </>
        }
      />

      {report ? (
        <AuditReportView report={report} params={params} active={active} />
      ) : (
        <Card>
          <EmptyState
            icon={<ScanSearch />}
            title="No audit yet"
            description="Run the first audit to get a score out of 100 and a to-do list. It crawls the homepage, products and published pages, checks up to 40 internal links and reviews the catalogue — it takes 10–20 seconds."
            action={<RunAuditButton label="Run the first audit" size="lg" align="center" />}
          />
          <SeverityLegend className="border-t border-b-0 bg-slate-50/60" />
        </Card>
      )}
    </>
  );
}

import { ExternalLink, Eye } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { z } from "zod";

import { ButtonAnchor } from "@/admin/components/ui/button";
import { Badge, Card, CardHeader, PageHeader } from "@/admin/components/ui/primitives";
import { HostingNotes } from "@/admin/features/pages/hosting-notes";
import {
  CopyLinkButton,
  DeletePageButton,
  DuplicatePageButton,
  PageStatusButton,
} from "@/admin/features/pages/page-actions";
import { PageForm } from "@/admin/features/pages/page-form";
import { getPageForEditing } from "@/admin/features/pages/queries";
import { VersionHistory } from "@/admin/features/pages/version-history";
import { formatBytes, formatDateTime } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Edit HTML page" };

const NewTab = () => <span className="sr-only"> (opens in a new tab)</span>;

export default async function EditPagePage({ params }: PageProps<"/admin/pages/[id]">) {
  await requirePermission("pages:write");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const page = await getPageForEditing(id);
  if (!page) notFound();

  const live = page.status === "published";
  const publicUrl = `${siteConfig.url}/${page.slug}`;
  const details: { label: string; value: ReactNode }[] = [
    {
      label: "Status",
      value: live ? (
        <Badge tone="leaf" dot>
          Published
        </Badge>
      ) : (
        <Badge tone="amber" dot>
          Draft — not visible to visitors
        </Badge>
      ),
    },
    {
      label: "Address",
      value: (
        <span className="flex items-center gap-1">
          <span className="min-w-0 font-mono text-[13px] break-all">{publicUrl}</span>
          <CopyLinkButton url={publicUrl} label="Copy page link" />
        </span>
      ),
    },
    { label: "Search engines", value: page.noindex ? "Hidden (noindex)" : "Can be listed" },
    { label: "Views", value: page.viewCount.toLocaleString("en-IN") },
    { label: "Size", value: formatBytes(new TextEncoder().encode(page.html).length) },
    ...(page.publishedAt && live ? [{ label: "Published", value: formatDateTime(page.publishedAt) }] : []),
    {
      label: "Created",
      value: `${formatDateTime(page.createdAt)}${page.createdByName ? ` by ${page.createdByName}` : ""}`,
    },
    {
      label: "Last updated",
      value: `${formatDateTime(page.updatedAt)}${page.updatedByName ? ` by ${page.updatedByName}` : ""}`,
    },
  ];

  return (
    <>
      <PageHeader
        title={page.title}
        description={live ? `Live at /${page.slug}` : `Draft — publish it to make /${page.slug} public.`}
        breadcrumbs={[{ label: "Website" }, { label: "HTML pages", href: "/admin/pages" }, { label: page.title }]}
        actions={
          <>
            <ButtonAnchor href={`/admin/pages/${page.id}/preview`} variant="secondary">
              <Eye aria-hidden="true" /> Preview
              <NewTab />
            </ButtonAnchor>
            {live ? (
              <ButtonAnchor href={`/${page.slug}`} variant="secondary">
                <ExternalLink aria-hidden="true" /> View live
                <NewTab />
              </ButtonAnchor>
            ) : null}
            <PageStatusButton id={page.id} status={page.status} />
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PageForm
          key={page.id}
          page={{
            id: page.id,
            title: page.title,
            slug: page.slug,
            description: page.description,
            noindex: page.noindex,
            status: page.status,
            html: page.html,
          }}
          siteUrl={siteConfig.url}
        />

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Page details" />
            <dl className="flex flex-col gap-3 px-5 py-4 text-sm">
              {details.map((item) => (
                <div key={item.label} className="grid grid-cols-[110px_minmax(0,1fr)] items-baseline gap-3">
                  <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{item.label}</dt>
                  <dd className="min-w-0 text-slate-800">{item.value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
              <DuplicatePageButton id={page.id} size="sm" />
              <DeletePageButton id={page.id} title={page.title} status={page.status} backToList />
            </div>
          </Card>
          <VersionHistory pageId={page.id} currentTitle={page.title} versions={page.versions} />
          <HostingNotes />
        </div>
      </div>
    </>
  );
}

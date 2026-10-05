import { ExternalLink, Eye, FileCode2, Pencil, Plus, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { adminButton, ButtonLink } from "@/admin/components/ui/button";
import { FilterBar, Pagination, hrefWith, pageParam, param } from "@/admin/components/ui/listing";
import {
  Badge,
  Callout,
  Card,
  EmptyState,
  LinkTabs,
  PageHeader,
  Table,
  TD,
  TH,
} from "@/admin/components/ui/primitives";
import { CopyLinkButton, DeletePageButton } from "@/admin/features/pages/page-actions";
import { listPages } from "@/admin/features/pages/queries";
import { formatBytes, formatDateTime, pluralize, timeAgo } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "HTML pages" };

const PAGE_SIZE = 25;
const BASE_PATH = "/admin/pages";

export default async function PagesPage({ searchParams }: PageProps<"/admin/pages">) {
  await requirePermission("pages:write");
  const params = await searchParams;
  const { deleted, ...listParams } = params;
  const q = param(params, "q");
  const statusParam = param(params, "status");
  const status = statusParam === "published" || statusParam === "draft" ? statusParam : "";
  const page = pageParam(params);
  const { rows, total, counts } = await listPages({ q, status, page, pageSize: PAGE_SIZE });
  const siteHost = siteConfig.url.replace(/^https?:\/\//, "");
  const filtered = Boolean(q || status);

  return (
    <>
      <PageHeader
        title="HTML pages"
        description="Upload a ready-made .html page — a festival offer, a product launch, a landing page from your designer — and it goes live at its own address on this website."
        breadcrumbs={[{ label: "Website" }, { label: "HTML pages" }]}
        actions={
          <ButtonLink href="/admin/pages/new">
            <Plus aria-hidden="true" /> New page
          </ButtonLink>
        }
      />

      {deleted ? (
        <Callout tone="success" className="mb-4">
          Page deleted.
        </Callout>
      ) : null}

      {counts.all === 0 && !q ? (
        <Card>
          <EmptyState
            icon={<FileCode2 />}
            title="No HTML pages yet"
            description={
              <>
                Upload an .html file and it’s served as-is at an address you choose, like{" "}
                <span className="font-mono text-slate-700">{siteHost}/diwali-offer</span>. Save it as a draft, preview
                it, then publish when it’s ready.
              </>
            }
            action={
              <ButtonLink href="/admin/pages/new">
                <Plus aria-hidden="true" /> Upload your first page
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <Card>
          <LinkTabs
            className="px-4 pt-1"
            items={[
              {
                label: "All",
                href: hrefWith(BASE_PATH, listParams, { status: null, page: null }),
                active: !status,
                count: counts.all,
              },
              {
                label: "Published",
                href: hrefWith(BASE_PATH, listParams, { status: "published", page: null }),
                active: status === "published",
                count: counts.published,
              },
              {
                label: "Drafts",
                href: hrefWith(BASE_PATH, listParams, { status: "draft", page: null }),
                active: status === "draft",
                count: counts.draft,
              },
            ]}
          />
          <FilterBar
            basePath={BASE_PATH}
            query={q}
            placeholder="Search by title, address or description…"
            hidden={{ status }}
          />

          {rows.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title="No pages match"
              description={filtered ? "Try another search, or clear the filters." : undefined}
              action={
                <Link href={BASE_PATH} className={adminButton({ variant: "secondary", size: "sm" })}>
                  Clear filters
                </Link>
              }
            />
          ) : (
            // `relative` keeps the sr-only labels inside the scroll area (no sideways page scroll on phones).
            <Table className="relative">
              <thead>
                <tr>
                  <TH>Page</TH>
                  <TH>Address</TH>
                  <TH>Status</TH>
                  <TH align="right">Views</TH>
                  <TH>Updated</TH>
                  <TH align="right">
                    <span className="sr-only">Actions</span>
                  </TH>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const publicUrl = `${siteConfig.url}/${row.slug}`;
                  const live = row.status === "published";
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/60">
                      <TD className="max-w-[320px]">
                        <Link
                          href={`/admin/pages/${row.id}`}
                          className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                        >
                          {row.title}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-slate-500" title={row.description || undefined}>
                          {row.description || `${formatBytes(row.bytes)} HTML`}
                        </p>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-1">
                          <span
                            className={
                              live ? "font-mono text-[13px] text-slate-700" : "font-mono text-[13px] text-slate-400"
                            }
                          >
                            /{row.slug}
                          </span>
                          <CopyLinkButton url={publicUrl} label="Copy page link" />
                          {live ? (
                            <a
                              href={`/${row.slug}`}
                              target="_blank"
                              rel="noopener"
                              className={adminButton({ variant: "ghost", size: "icon-sm" })}
                              title="Open the live page"
                              aria-label={`Open /${row.slug} (opens in a new tab)`}
                            >
                              <ExternalLink aria-hidden="true" />
                            </a>
                          ) : null}
                        </div>
                      </TD>
                      <TD>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {live ? (
                            <Badge tone="leaf" dot>
                              Published
                            </Badge>
                          ) : (
                            <Badge tone="amber" dot>
                              Draft
                            </Badge>
                          )}
                          {row.noindex ? <Badge tone="slate">Hidden from search</Badge> : null}
                        </div>
                      </TD>
                      <TD align="right" className="tabular-nums">
                        {row.viewCount.toLocaleString("en-IN")}
                      </TD>
                      <TD className="whitespace-nowrap text-slate-500">
                        <time dateTime={row.updatedAt.toISOString()} title={formatDateTime(row.updatedAt)}>
                          {timeAgo(row.updatedAt)}
                        </time>
                      </TD>
                      <TD align="right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Link
                            href={`/admin/pages/${row.id}`}
                            className={adminButton({ variant: "ghost", size: "icon-sm" })}
                            title="Edit"
                            aria-label={`Edit “${row.title}”`}
                          >
                            <Pencil aria-hidden="true" />
                          </Link>
                          <a
                            href={`/admin/pages/${row.id}/preview`}
                            target="_blank"
                            rel="noopener"
                            className={adminButton({ variant: "ghost", size: "icon-sm" })}
                            title="Preview"
                            aria-label={`Preview “${row.title}” (opens in a new tab)`}
                          >
                            <Eye aria-hidden="true" />
                          </a>
                          <DeletePageButton id={row.id} title={row.title} status={row.status} iconOnly />
                        </div>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          <Pagination basePath={BASE_PATH} params={listParams} page={page} pageSize={PAGE_SIZE} total={total} />
        </Card>
      )}

      {counts.all > 0 ? (
        <p className="mt-4 text-xs text-slate-500">
          {pluralize(counts.published, "page")} live. Views count visits that reach the server (approximate: cached
          copies and search-engine bots aren’t counted).
        </p>
      ) : null}
    </>
  );
}

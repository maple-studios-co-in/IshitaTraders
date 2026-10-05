import { ArrowRight, ExternalLink, Pencil, SearchX, Signpost, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { adminButton } from "@/admin/components/ui/button";
import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { FilterBar, Pagination, hrefWith, pageParam, param } from "@/admin/components/ui/listing";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkTabs,
  PageHeader,
  Table,
  TD,
  TH,
} from "@/admin/components/ui/primitives";
import { deleteRedirect } from "@/admin/features/redirects/actions";
import { ImportRedirectsForm } from "@/admin/features/redirects/import-form";
import { getRedirect, listRedirects } from "@/admin/features/redirects/queries";
import { RedirectForm } from "@/admin/features/redirects/redirect-form";
import { RedirectToggle } from "@/admin/features/redirects/redirect-toggle";
import { isRedirectCode, redirectCodeInfo } from "@/admin/features/redirects/rules";
import { formatDateTime, timeAgo } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Redirects" };

const PAGE_SIZE = 50;
const BASE_PATH = "/admin/redirects";

export default async function RedirectsPage({ searchParams }: PageProps<"/admin/redirects">) {
  await requirePermission("redirects:write");
  const params = await searchParams;
  const q = param(params, "q");
  const statusParam = param(params, "status");
  const status = statusParam === "active" || statusParam === "paused" ? statusParam : "";
  const page = pageParam(params);
  const editId = param(params, "edit");

  const [{ rows, total, counts }, editing] = await Promise.all([
    listRedirects({ q, status, page, pageSize: PAGE_SIZE }),
    z.string().uuid().safeParse(editId).success ? getRedirect(editId) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        title="Redirects"
        description="Send visitors — and search engines — from old or mistyped addresses to the right page, so shared links and Google results keep working."
        breadcrumbs={[{ label: "Growth" }, { label: "Redirects" }]}
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          {counts.all === 0 && !q ? (
            <EmptyState
              icon={<Signpost />}
              title="No redirects yet"
              description="When a page moves or an old link is out there (a printed brochure, an old website), add a redirect so visitors land in the right place instead of a “page not found”."
            />
          ) : (
            <>
              <LinkTabs
                className="px-4 pt-1"
                items={[
                  {
                    label: "All",
                    href: hrefWith(BASE_PATH, params, { status: null, page: null, edit: null }),
                    active: !status,
                    count: counts.all,
                  },
                  {
                    label: "On",
                    href: hrefWith(BASE_PATH, params, { status: "active", page: null, edit: null }),
                    active: status === "active",
                    count: counts.active,
                  },
                  {
                    label: "Paused",
                    href: hrefWith(BASE_PATH, params, { status: "paused", page: null, edit: null }),
                    active: status === "paused",
                    count: counts.paused,
                  },
                ]}
              />
              <FilterBar
                basePath={BASE_PATH}
                query={q}
                placeholder="Search old or new addresses…"
                hidden={{ status }}
              />
              {rows.length === 0 ? (
                <EmptyState
                  icon={<SearchX />}
                  title="No redirects match"
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
                      <TH>From</TH>
                      <TH>To</TH>
                      <TH>Type</TH>
                      <TH>Status</TH>
                      <TH align="right">Hits</TH>
                      <TH>Last hit</TH>
                      <TH align="right">
                        <span className="sr-only">Actions</span>
                      </TH>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const info = isRedirectCode(row.statusCode) ? redirectCodeInfo[row.statusCode] : null;
                      const external = /^https?:\/\//i.test(row.destination);
                      return (
                        <tr
                          key={row.id}
                          className={cn("hover:bg-slate-50/60", editing?.id === row.id && "bg-brand-500/5")}
                        >
                          <TD className="max-w-[220px]">
                            <a
                              href={row.source}
                              target="_blank"
                              rel="noopener"
                              className="block truncate font-mono text-[13px] text-navy-900 hover:text-brand-600 hover:underline"
                              title={`Test ${row.source} (opens in a new tab)`}
                            >
                              {row.source}
                            </a>
                          </TD>
                          <TD className="max-w-[260px]">
                            <span className="flex items-center gap-1.5 font-mono text-[13px] text-slate-700">
                              <ArrowRight className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                              <span className="truncate" title={row.destination}>
                                {row.destination}
                              </span>
                              {external ? (
                                <>
                                  <ExternalLink className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                                  <span className="sr-only">(another website)</span>
                                </>
                              ) : null}
                            </span>
                          </TD>
                          <TD className="whitespace-nowrap">
                            <Badge tone={info?.kind === "Temporary" ? "amber" : "navy"}>
                              {row.statusCode}
                              {info ? ` · ${info.kind}` : null}
                            </Badge>
                          </TD>
                          <TD>
                            <RedirectToggle id={row.id} isActive={row.isActive} source={row.source} />
                          </TD>
                          <TD align="right" className="tabular-nums">
                            {row.hitCount.toLocaleString("en-IN")}
                          </TD>
                          <TD className="whitespace-nowrap text-slate-500">
                            {row.lastHitAt ? (
                              <time dateTime={row.lastHitAt.toISOString()} title={formatDateTime(row.lastHitAt)}>
                                {timeAgo(row.lastHitAt)}
                              </time>
                            ) : (
                              "Never"
                            )}
                          </TD>
                          <TD align="right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Link
                                href={hrefWith(BASE_PATH, params, { edit: row.id })}
                                className={adminButton({ variant: "ghost", size: "icon-sm" })}
                                title="Edit"
                                aria-label={`Edit the redirect from ${row.source}`}
                              >
                                <Pencil aria-hidden="true" />
                              </Link>
                              <ConfirmAction
                                action={deleteRedirect}
                                fields={{ id: row.id }}
                                title="Delete this redirect?"
                                description={
                                  <>
                                    Visitors to <span className="font-mono">{row.source}</span> will see “page not
                                    found” instead of going to{" "}
                                    <span className="font-mono break-all">{row.destination}</span>. To stop it for now,
                                    pause it instead.
                                  </>
                                }
                                confirmLabel="Delete redirect"
                                size="icon-sm"
                                ariaLabel={`Delete the redirect from ${row.source}`}
                              >
                                <Trash2 aria-hidden="true" />
                              </ConfirmAction>
                            </div>
                          </TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
              <Pagination basePath={BASE_PATH} params={params} page={page} pageSize={PAGE_SIZE} total={total} />
            </>
          )}
        </Card>

        <div className="flex flex-col gap-6 xl:sticky xl:top-24">
          <Card className={editing ? "ring-2 ring-brand-500/30" : undefined}>
            <CardHeader
              title={editing ? "Edit redirect" : "Add a redirect"}
              description={editing ? <span className="font-mono">{editing.source}</span> : undefined}
            />
            <div className="p-5">
              {editing ? (
                <RedirectForm
                  key={editing.id}
                  redirect={{
                    id: editing.id,
                    source: editing.source,
                    destination: editing.destination,
                    statusCode: editing.statusCode,
                    isActive: editing.isActive,
                  }}
                />
              ) : (
                <RedirectForm key="new" />
              )}
            </div>
          </Card>

          <Card>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block font-display text-base font-bold text-navy-950">
                    Import from a spreadsheet
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-500">
                    Add many redirects at once, e.g. when moving from an old website.
                  </span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              <div className="border-t border-slate-100 p-5">
                <ImportRedirectsForm />
              </div>
            </details>
          </Card>

          <Card>
            <CardHeader title="Good to know" />
            <ul className="flex list-disc flex-col gap-2 py-4 pr-5 pl-9 text-sm leading-relaxed text-slate-600">
              <li>
                Use <strong>301</strong> when a page has moved for good — search engines move its ranking to the new
                address. Use <strong>302</strong> for something temporary, like a seasonal offer.
              </li>
              <li>Redirects only run for addresses that don’t exist on the website, so they can’t hide a real page.</li>
              <li>Changes take effect immediately. Click an old address in the list to test it.</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

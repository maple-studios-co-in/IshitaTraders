import { count } from "drizzle-orm";
import { ExternalLink, FileText, ImageOff, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { adminButton } from "@/admin/components/ui/button";
import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { CopyButton } from "@/admin/components/ui/copy-button";
import { FilterBar, hrefWith, pageParam, Pagination, param, type SearchParams } from "@/admin/components/ui/listing";
import { Badge, Card, EmptyState, LinkTabs, PageHeader } from "@/admin/components/ui/primitives";
import { deleteMedia } from "@/admin/features/media/actions";
import { MediaAltForm } from "@/admin/features/media/media-alt-form";
import { MediaUploader } from "@/admin/features/media/media-uploader";
import { collectMediaUsage, listMedia } from "@/admin/features/media/queries";
import { formatBytes, formatDate } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { media } from "@/admin/server/db/schema";
import { env } from "@/admin/server/env";

export const metadata: Metadata = { title: "Media library" };

const PAGE_SIZE = 24;

export default async function MediaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePermission("media:write");
  const params = await searchParams;
  const q = param(params, "q");
  const kindParam = param(params, "kind");
  const kind = kindParam === "image" || kindParam === "document" ? kindParam : undefined;
  const page = pageParam(params);

  const db = await getDb();
  const [{ items, total }, usage, kindCounts] = await Promise.all([
    listMedia({ q, kind, page, pageSize: PAGE_SIZE }),
    collectMediaUsage(),
    db.select({ kind: media.kind, total: count() }).from(media).groupBy(media.kind),
  ]);
  const countFor = (value: "image" | "document") => kindCounts.find((row) => row.kind === value)?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Media library"
        description={
          <>
            Every image and PDF uploaded for the website. Files are stored{" "}
            {env.blobToken ? "on Vercel Blob (global CDN)" : "in the database and served from this site"} and cached by
            browsers for a year.
          </>
        }
        breadcrumbs={[{ label: "Website" }, { label: "Media library" }]}
      />

      <div className="flex flex-col gap-6">
        <MediaUploader />

        <Card>
          <LinkTabs
            className="px-4 pt-1"
            items={[
              {
                label: "All files",
                href: hrefWith("/admin/media", params, { kind: null, page: null }),
                active: !kind,
                count: countFor("image") + countFor("document"),
              },
              {
                label: "Images",
                href: hrefWith("/admin/media", params, { kind: "image", page: null }),
                active: kind === "image",
                count: countFor("image"),
              },
              {
                label: "Documents",
                href: hrefWith("/admin/media", params, { kind: "document", page: null }),
                active: kind === "document",
                count: countFor("document"),
              },
            ]}
          />
          <FilterBar
            basePath="/admin/media"
            query={q}
            placeholder="Search by file name or description…"
            hidden={{ kind: kind ?? "" }}
          />

          {items.length === 0 ? (
            <EmptyState
              icon={<ImageOff />}
              title={q ? "Nothing matches that search" : "No files yet"}
              description={
                q
                  ? "Try another word, or clear the search."
                  : "Upload product photos, banners and datasheets above — then pick them anywhere in the admin."
              }
            />
          ) : (
            <ul className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => {
                const usedIn = usage.get(item.id) ?? [];
                return (
                  <li
                    key={item.id}
                    className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative flex aspect-[4/3] items-center justify-center bg-[#f3f9ff]"
                      aria-label={`Open ${item.fileName}`}
                    >
                      {item.kind === "image" ? (
                        <Image
                          src={item.url}
                          alt={item.alt}
                          fill
                          sizes="(min-width: 1280px) 280px, (min-width: 640px) 45vw, 90vw"
                          className="object-contain p-3"
                        />
                      ) : (
                        <FileText className="size-12 text-red-500" aria-hidden="true" />
                      )}
                    </a>
                    <div className="flex flex-1 flex-col gap-2.5 border-t border-slate-100 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800" title={item.fileName}>
                          {item.fileName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatBytes(item.size)}
                          {item.width ? ` · ${item.width}×${item.height}` : ""} · {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {usedIn.length === 0 ? (
                          <Badge>Not used</Badge>
                        ) : (
                          usedIn.slice(0, 2).map((use) => (
                            <Link key={use.label} href={use.href} className="max-w-full">
                              <Badge tone="blue" className="max-w-full truncate">
                                {use.label}
                              </Badge>
                            </Link>
                          ))
                        )}
                        {usedIn.length > 2 ? <Badge tone="blue">+{usedIn.length - 2} more</Badge> : null}
                      </div>
                      <MediaAltForm id={item.id} alt={item.alt} />
                      <div className="mt-auto flex items-center gap-1 border-t border-slate-100 pt-2">
                        <CopyButton value={item.url} />
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={adminButton({ variant: "ghost", size: "icon-sm" })}
                          aria-label={`Open ${item.fileName} in a new tab`}
                        >
                          <ExternalLink />
                        </a>
                        <span className="ml-auto">
                          <ConfirmAction
                            action={deleteMedia}
                            fields={usedIn.length ? { id: item.id, force: "1" } : { id: item.id }}
                            title={usedIn.length ? "Delete a file that’s in use?" : "Delete this file?"}
                            description={
                              usedIn.length ? (
                                <>
                                  “{item.fileName}” is still used by{" "}
                                  <strong>{usedIn.map((use) => use.label).join(", ")}</strong>. Those places will show
                                  no image until you pick a new one.
                                </>
                              ) : (
                                <>“{item.fileName}” will be permanently deleted.</>
                              )
                            }
                            confirmLabel="Delete file"
                            size="icon-sm"
                            ariaLabel={`Delete ${item.fileName}`}
                          >
                            <Trash2 />
                          </ConfirmAction>
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Pagination basePath="/admin/media" params={params} page={page} pageSize={PAGE_SIZE} total={total} />
        </Card>
      </div>
    </>
  );
}

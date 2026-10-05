import { Download, History, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { adminButton } from "@/admin/components/ui/button";
import { controlClass } from "@/admin/components/ui/form-controls";
import { FilterBar, FilterSelect, Pagination, pageParam, param } from "@/admin/components/ui/listing";
import { Card, CardHeader, EmptyState, PageHeader, Table, TH } from "@/admin/components/ui/primitives";
import { ActivityRows, type ActivityRowView } from "@/admin/features/activity/activity-rows";
import { actionTone, formatChanges, humanize, splitActor } from "@/admin/features/activity/format";
import {
  ACTIVITY_PAGE_SIZE,
  getActivityFacets,
  hasActivityFilters,
  listActivity,
  readActivityFilters,
} from "@/admin/features/activity/queries";
import { formatDateTime, pluralize, timeAgo } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Activity log" };

const BASE_PATH = "/admin/activity";

const exactTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "long",
  timeZone: "Asia/Kolkata",
});

/** Adds the selected value when it isn't among the known options (e.g. a shared link). */
function withCurrent(values: string[], current: string) {
  return current && !values.includes(current) ? [current, ...values] : values;
}

export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requirePermission("activity:read");
  const params = await searchParams;
  const filters = readActivityFilters((key) => param(params, key));
  const filtered = hasActivityFilters(filters);
  const [{ rows, total, page }, facets] = await Promise.all([
    listActivity(filters, pageParam(params)),
    getActivityFacets(),
  ]);

  const views: ActivityRowView[] = rows.map((row) => {
    const actor = splitActor(row.actorName);
    return {
      id: row.id,
      iso: row.createdAt.toISOString(),
      time: formatDateTime(row.createdAt),
      exactTime: exactTime.format(row.createdAt),
      relative: timeAgo(row.createdAt),
      actorName: actor.name,
      actorEmail: actor.email,
      action: row.action,
      tone: actionTone(row.action),
      entityLabel: humanize(row.entityType),
      entityId: row.entityId,
      summary: row.summary,
      ip: row.ip,
      changes: formatChanges(row.changes),
    };
  });

  const exportQuery = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
  const exportHref = `/api/admin/export/activity${exportQuery ? `?${exportQuery}` : ""}`;

  return (
    <>
      <PageHeader
        title="Activity log"
        description="Every change made in the admin — who did what, and when. Entries are permanent and can’t be edited."
        breadcrumbs={[{ label: "Administration" }, { label: "Activity log" }]}
        actions={
          <a href={exportHref} download className={adminButton({ variant: "secondary" })}>
            <Download aria-hidden="true" /> {filtered ? "Export filtered CSV" : "Export CSV"}
          </a>
        }
      />

      <Card>
        <CardHeader
          title="Entries"
          description={
            filtered
              ? `${pluralize(total, "entry", "entries")} match the filters`
              : `${pluralize(total, "entry", "entries")} · newest first · click a row to see what changed`
          }
        />
        <FilterBar
          basePath={BASE_PATH}
          query={filters.q}
          placeholder="Search summary or person…"
          className="sm:flex-wrap [&>label:first-of-type]:basis-60"
        >
          <FilterSelect
            name="entity"
            value={filters.entity}
            label="All entities"
            options={withCurrent(facets.entityTypes, filters.entity).map((value) => ({
              value,
              label: humanize(value),
            }))}
          />
          <FilterSelect
            name="action"
            value={filters.action}
            label="All actions"
            options={withCurrent(facets.actions, filters.action).map((value) => ({ value, label: value }))}
          />
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            From
            <input
              type="date"
              name="from"
              defaultValue={filters.from}
              max={filters.to || undefined}
              className={cn(controlClass, "h-9 w-auto")}
              aria-label="From date"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            To
            <input
              type="date"
              name="to"
              defaultValue={filters.to}
              min={filters.from || undefined}
              className={cn(controlClass, "h-9 w-auto")}
              aria-label="To date"
            />
          </label>
        </FilterBar>

        {views.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<SearchX />}
              title="No entries match these filters"
              description="Try a wider date range or a different search."
              action={
                <Link href={BASE_PATH} className={adminButton({ variant: "secondary", size: "sm" })}>
                  Clear filters
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<History />}
              title="No activity yet"
              description="Sign-ins and every change made in the admin will appear here."
            />
          )
        ) : (
          <Table className="[&_table]:min-w-[880px]">
            <thead>
              <tr>
                <TH className="w-10 pr-0">
                  <span className="sr-only">Details</span>
                </TH>
                <TH>Time</TH>
                <TH>Person</TH>
                <TH>Action</TH>
                <TH>Entity</TH>
                <TH>Summary</TH>
              </tr>
            </thead>
            <tbody>
              <ActivityRows rows={views} />
            </tbody>
          </Table>
        )}
        <Pagination basePath={BASE_PATH} params={params} page={page} pageSize={ACTIVITY_PAGE_SIZE} total={total} />
      </Card>
    </>
  );
}

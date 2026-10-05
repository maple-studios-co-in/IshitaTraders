import { CheckCheck, ClipboardList, Download, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActionButton } from "@/admin/components/ui/action-button";
import { adminButton } from "@/admin/components/ui/button";
import { controlClass } from "@/admin/components/ui/form-controls";
import { hrefWith, pageParam, Pagination, param, type SearchParams } from "@/admin/components/ui/listing";
import { Callout, Card, EmptyState, LinkTabs, PageHeader } from "@/admin/components/ui/primitives";
import { formKeys, siteForms } from "@/admin/config/forms";
import { can } from "@/admin/config/permissions";
import { enquiryStatuses, enquiryStatusLabels } from "@/admin/content/types";
import { markAllEnquiriesRead } from "@/admin/features/enquiries/actions";
import { EnquiriesBulkBar } from "@/admin/features/enquiries/enquiry-controls";
import { EnquiryTable } from "@/admin/features/enquiries/enquiry-table";
import { formInfo } from "@/admin/features/enquiries/presentation";
import { enquiryCounts, listEnquiries, type EnquiryFilters } from "@/admin/features/enquiries/queries";
import { pluralize } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Enquiries" };

const PAGE_SIZE = 25;
const GROUP_PREVIEW = 5;

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePermission("enquiries:read");
  const params = await searchParams;
  const filters: EnquiryFilters = {
    form: param(params, "form"),
    status: param(params, "status"),
    q: param(params, "q"),
    unread: param(params, "unread") === "1",
    from: param(params, "from"),
    to: param(params, "to"),
  };
  const page = pageParam(params);
  const canWrite = can(user.role, "enquiries:write");

  const counts = await enquiryCounts(filters);
  // Every form on the site, plus any older form that still has submissions.
  const knownKeys = [
    ...formKeys,
    ...counts.byForm.map((row) => row.formKey).filter((key) => !formKeys.includes(key as never)),
  ];
  const formRows = knownKeys.map((key) => {
    const row = counts.byForm.find((item) => item.formKey === key);
    return { key, ...formInfo(key, row?.formName ?? key), total: row?.total ?? 0, unread: row?.unread ?? 0 };
  });
  const totalAll = formRows.reduce((sum, row) => sum + row.total, 0);
  const statusTotal = [...counts.byStatus.entries()]
    .filter(([status]) => status !== "spam")
    .reduce((sum, [, total]) => sum + total, 0);

  const sections = filters.form
    ? [
        { ...formRows.find((row) => row.key === filters.form)!, ...(await listEnquiries(filters, page, PAGE_SIZE)) },
      ].filter((section) => section.key)
    : await Promise.all(
        formRows.map(async (row) => ({
          ...row,
          ...(await listEnquiries({ ...filters, form: row.key }, 1, GROUP_PREVIEW)),
        })),
      );

  const exportHref = hrefWith("/api/admin/export/enquiries", params, { page: null });
  const filtered = Boolean(filters.q || filters.status || filters.unread || filters.from || filters.to);

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Everything visitors submit through the website’s forms — grouped by the form they filled in, with every detail they entered."
        breadcrumbs={[{ label: "Leads" }, { label: "Enquiries" }]}
        actions={
          <>
            <a href={exportHref} download className={adminButton({ variant: "secondary" })}>
              <Download aria-hidden="true" /> Export CSV
            </a>
            {canWrite ? (
              <ActionButton action={markAllEnquiriesRead} fields={{ form: filters.form ?? "" }} pendingLabel="Marking…">
                <CheckCheck aria-hidden="true" /> Mark all read
              </ActionButton>
            ) : null}
          </>
        }
      />

      {param(params, "deleted") ? (
        <Callout tone="success" className="mb-4">
          Enquiry deleted.
        </Callout>
      ) : null}

      <Card>
        <LinkTabs
          className="px-4 pt-1"
          items={[
            {
              label: "All forms",
              href: hrefWith("/admin/enquiries", params, { form: null, page: null }),
              active: !filters.form,
              count: totalAll,
            },
            ...formRows.map((row) => ({
              label: (
                <span className="flex items-center gap-1.5">
                  {row.name}
                  {row.unread ? (
                    <span className="size-1.5 rounded-full bg-brand-500" aria-label={`${row.unread} unread`} />
                  ) : null}
                </span>
              ),
              href: hrefWith("/admin/enquiries", params, { form: row.key, page: null }),
              active: filters.form === row.key,
              count: row.total,
            })),
          ]}
        />

        <form
          action="/admin/enquiries"
          method="get"
          role="search"
          className="flex flex-col gap-2 border-b border-slate-100 p-3 lg:flex-row lg:items-center"
        >
          {filters.form ? <input type="hidden" name="form" value={filters.form} /> : null}
          {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
          <label className="flex-1">
            <span className="sr-only">Search</span>
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="Search name, phone, email, company, product or message…"
              className={cn(controlClass, "h-9")}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              From
              <input type="date" name="from" defaultValue={filters.from} className={cn(controlClass, "h-9 w-auto")} />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              To
              <input type="date" name="to" defaultValue={filters.to} className={cn(controlClass, "h-9 w-auto")} />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                name="unread"
                value="1"
                defaultChecked={filters.unread}
                className="size-4 accent-navy-800"
              />{" "}
              Unread only
            </label>
            <button type="submit" className={adminButton({ variant: "secondary", size: "sm", className: "h-9" })}>
              Apply
            </button>
            <Link
              href={filters.form ? `/admin/enquiries?form=${filters.form}` : "/admin/enquiries"}
              className={adminButton({ variant: "ghost", size: "sm", className: "h-9" })}
            >
              Reset
            </Link>
          </div>
        </form>

        <nav aria-label="Status" className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2.5">
          <StatusChip
            href={hrefWith("/admin/enquiries", params, { status: null, page: null })}
            active={!filters.status}
            label="All open"
            count={statusTotal}
          />
          {enquiryStatuses.map((status) => (
            <StatusChip
              key={status}
              href={hrefWith("/admin/enquiries", params, { status, page: null })}
              active={filters.status === status}
              label={enquiryStatusLabels[status]}
              count={counts.byStatus.get(status) ?? 0}
            />
          ))}
        </nav>

        {canWrite ? <EnquiriesBulkBar canDelete={can(user.role, "enquiries:delete")} /> : null}

        {sections.every((section) => section.total === 0) ? (
          <EmptyState
            icon={<ClipboardList />}
            title={filtered ? "No enquiries match these filters" : "No enquiries yet"}
            description={
              filtered
                ? "Try a wider date range or clear the search."
                : "When visitors submit the contact form or a product RFQ on the website, they appear here instantly — and you can get an email for each one (Integrations)."
            }
          />
        ) : (
          <div className="divide-y-4 divide-slate-100">
            {sections.map((section) => (
              <section key={section.key} aria-labelledby={`form-${section.key}`}>
                <header className="flex flex-wrap items-end justify-between gap-3 bg-slate-50/70 px-4 py-3">
                  <div className="min-w-0">
                    <h2 id={`form-${section.key}`} className="font-display text-base font-bold text-navy-950">
                      {section.name}
                    </h2>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="size-3.5 shrink-0" aria-hidden="true" /> {section.location}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {pluralize(section.total, "enquiry", "enquiries")}
                    {section.unread ? (
                      <span className="font-semibold text-brand-600"> · {section.unread} unread</span>
                    ) : null}
                    {!filters.form && section.total > GROUP_PREVIEW ? (
                      <>
                        {" · "}
                        <Link
                          href={hrefWith("/admin/enquiries", params, { form: section.key, page: null })}
                          className="font-semibold text-brand-600 hover:underline"
                        >
                          View all {section.total} →
                        </Link>
                      </>
                    ) : null}
                  </p>
                </header>
                {section.rows.length ? (
                  <EnquiryTable rows={section.rows} selectable={canWrite} />
                ) : (
                  <p className="px-4 py-5 text-sm text-slate-500">
                    No enquiries from this form{filtered ? " match the filters" : " yet"}.
                  </p>
                )}
                {filters.form ? (
                  <Pagination
                    basePath="/admin/enquiries"
                    params={params}
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={section.total}
                  />
                ) : null}
              </section>
            ))}
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-slate-500">
        Forms on the website:{" "}
        {formKeys.map((key, index) => (
          <span key={key}>
            {index ? " · " : ""}
            <strong className="font-semibold text-slate-600">{siteForms[key].name}</strong> ({siteForms[key].location})
          </span>
        ))}
      </p>
    </>
  );
}

function StatusChip({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-navy-800 bg-navy-800 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-navy-800/40 hover:text-navy-900",
      )}
    >
      {label}
      <span className={cn("tabular-nums", active ? "text-white/80" : "text-slate-400")}>{count}</span>
    </Link>
  );
}

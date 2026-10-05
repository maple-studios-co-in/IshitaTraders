import { Download, ExternalLink, Inbox, Mail, MessageCircle, MousePointerClick, Phone, Trash2 } from "lucide-react";
import type { Metadata } from "next";

import { adminButton, ButtonLink } from "@/admin/components/ui/button";
import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { controlClass } from "@/admin/components/ui/form-controls";
import {
  FilterBar,
  FilterSelect,
  hrefWith,
  pageParam,
  Pagination,
  type SearchParams,
} from "@/admin/components/ui/listing";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkTabs,
  PageHeader,
  StatCard,
  Table,
  TD,
  TH,
} from "@/admin/components/ui/primitives";
import { can } from "@/admin/config/permissions";
import { leadEventLabels, leadEventTypes, messageStatuses, messageStatusLabels } from "@/admin/content/types";
import { deleteLeadEvent } from "@/admin/features/inbox/actions";
import { LogConversation } from "@/admin/features/inbox/log-conversation";
import { MessageTable, type MessageRowView } from "@/admin/features/inbox/message-table";
import { contactTitle, LeadEventLabel } from "@/admin/features/inbox/presentation";
import {
  CLICKS_PAGE_SIZE,
  getClickSummary,
  getInboxCounts,
  listClicks,
  listMessages,
  listProductOptions,
  MESSAGES_PAGE_SIZE,
  parseClickFilters,
  parseInboxTab,
  parseMessageFilters,
  type InboxTab,
} from "@/admin/features/inbox/queries";
import { formatDateTime, formatPhone, pluralize, timeAgo } from "@/admin/lib/format";
import type { SessionUser } from "@/admin/server/auth/session";
import { requirePermission } from "@/admin/server/auth/guard";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Inbox" };

const BASE = "/admin/inbox";

const tabs: { key: InboxTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "call", label: "Calls" },
  { key: "other", label: "Other" },
  { key: "clicks", label: "Contact clicks" },
];

/** Only the listed params (so switching tabs keeps a search but drops the other view's filters). */
const keep = (params: SearchParams, keys: string[]): SearchParams =>
  Object.fromEntries(keys.map((key) => [key, params[key]]));

export default async function InboxPage({ searchParams }: PageProps<"/admin/inbox">) {
  const user = await requirePermission("inbox:read");
  const params = await searchParams;
  const tab = parseInboxTab(params);
  const canWrite = can(user.role, "inbox:write");
  const [counts, products] = await Promise.all([
    getInboxCounts(),
    canWrite ? listProductOptions() : Promise.resolve([]),
  ]);

  const exportHref =
    tab === "clicks"
      ? hrefWith("/api/admin/export/inbox", keep(params, ["q", "type", "from", "to"]), { kind: "clicks" })
      : hrefWith("/api/admin/export/inbox", keep(params, ["tab", "q", "status", "read"]), { kind: "messages" });

  return (
    <>
      <PageHeader
        title="Inbox"
        description="WhatsApp, email, SMS and phone conversations in one place — plus every click on the website’s contact buttons."
        breadcrumbs={[{ label: "Leads" }, { label: "Inbox" }]}
        actions={
          <>
            <a href={exportHref} className={adminButton({ variant: "secondary" })}>
              <Download aria-hidden="true" /> Export CSV
            </a>
            {canWrite ? <LogConversation products={products} /> : null}
          </>
        }
      />

      <LinkTabs
        className="mb-6"
        items={tabs.map((item) => ({
          label: item.label,
          count: counts[item.key],
          active: tab === item.key,
          href:
            item.key === "clicks"
              ? `${BASE}?tab=clicks`
              : hrefWith(BASE, tab === "clicks" ? {} : keep(params, ["q", "status", "read"]), {
                  tab: item.key === "all" ? null : item.key,
                }),
        }))}
      />

      {tab === "clicks" ? (
        <ClicksView params={params} user={user} />
      ) : (
        <MessagesView params={params} user={user} tab={tab} />
      )}
    </>
  );
}

async function MessagesView({ params, user, tab }: { params: SearchParams; user: SessionUser; tab: InboxTab }) {
  const filters = parseMessageFilters(params);
  const page = pageParam(params);
  const { rows, total, unread } = await listMessages(filters, page);
  const filtered = Boolean(filters.q || filters.status || filters.read);
  const lastPage = Math.max(1, Math.ceil(total / MESSAGES_PAGE_SIZE));
  const tabParam = tab === "all" ? "" : tab;

  const views: MessageRowView[] = rows.map((row) => {
    const phone = row.contactPhone ? formatPhone(row.contactPhone) : "";
    return {
      id: row.id,
      channel: row.channel,
      direction: row.direction,
      status: row.status,
      isRead: row.isRead,
      source: row.source,
      contact: contactTitle(row),
      contactDetail: row.contactName
        ? [phone, row.contactEmail].filter(Boolean).join(" · ")
        : phone && row.contactEmail
          ? row.contactEmail
          : "",
      subject: row.subject,
      snippet: row.snippet.replace(/\s+/g, " ").trim(),
      productName: row.productName,
      timeIso: row.occurredAt.toISOString(),
      timeLabel: timeAgo(row.occurredAt),
      timeTitle: formatDateTime(row.occurredAt),
    };
  });

  return (
    <Card>
      <FilterBar
        basePath={tabParam ? `${BASE}?tab=${tabParam}` : BASE}
        query={filters.q}
        placeholder="Search name, phone, email or message text…"
        hidden={{ tab: tabParam }}
      >
        <FilterSelect
          name="status"
          value={filters.status ?? ""}
          label="Any status (spam hidden)"
          options={messageStatuses.map((status) => ({ value: status, label: messageStatusLabels[status] }))}
        />
        <FilterSelect
          name="read"
          value={filters.read ?? ""}
          label="Read and unread"
          options={[
            { value: "unread", label: "Unread only" },
            { value: "read", label: "Read only" },
          ]}
        />
      </FilterBar>
      <MessageTable
        rows={views}
        canWrite={can(user.role, "inbox:write")}
        canDelete={can(user.role, "enquiries:delete")}
        showingSpam={filters.status === "spam"}
        summary={`${pluralize(total, "message")} · ${unread.toLocaleString("en-IN")} unread`}
        empty={
          page > lastPage ? (
            // e.g. after deleting every row on the last page.
            <EmptyState
              icon={<Inbox />}
              title="This page is empty"
              action={
                <ButtonLink
                  href={hrefWith(BASE, params, { page: lastPage > 1 ? lastPage : null })}
                  variant="secondary"
                  size="sm"
                >
                  Go to page {lastPage}
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              icon={<Inbox />}
              title={filtered ? "No messages match these filters" : "No messages yet"}
              description={
                filtered
                  ? "Try a different search or clear the filters."
                  : "WhatsApp, email and SMS messages appear here once their webhooks are connected. You can also log calls and visits by hand."
              }
              action={
                !filtered && can(user.role, "integrations:manage") ? (
                  <ButtonLink href="/admin/integrations" variant="secondary" size="sm">
                    Set up integrations
                  </ButtonLink>
                ) : undefined
              }
            />
          )
        }
      />
      {page <= lastPage ? (
        <Pagination basePath={BASE} params={params} page={page} pageSize={MESSAGES_PAGE_SIZE} total={total} />
      ) : null}
    </Card>
  );
}

function referrerHost(referrer: string) {
  if (!referrer) return "";
  try {
    return new URL(referrer).host.replace(/^www\./, "");
  } catch {
    return referrer.slice(0, 60);
  }
}

const isSitePath = (path: string) => /^\/(?!\/)[^\s\\]*$/.test(path);

async function ClicksView({ params, user }: { params: SearchParams; user: SessionUser }) {
  const filters = parseClickFilters(params);
  const page = pageParam(params);
  const [{ rows, total }, summary] = await Promise.all([listClicks(filters, page), getClickSummary(7)]);
  const canDelete = can(user.role, "enquiries:delete");
  const filtered = Boolean(filters.q || filters.type || filters.from || filters.to);
  const lastPage = Math.max(1, Math.ceil(total / CLICKS_PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Contact clicks in the last 7 days" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="WhatsApp clicks · 7 days"
          value={summary.totals.whatsapp.toLocaleString("en-IN")}
          icon={<MessageCircle />}
          tone="leaf"
        />
        <StatCard
          label="Call clicks · 7 days"
          value={summary.totals.call.toLocaleString("en-IN")}
          icon={<Phone />}
          tone="amber"
        />
        <StatCard
          label="Email clicks · 7 days"
          value={summary.totals.email.toLocaleString("en-IN")}
          icon={<Mail />}
          tone="blue"
        />
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-sm font-medium text-slate-500">Top sections · 7 days</p>
          {summary.topContexts.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No clicks yet.</p>
          ) : (
            <ol className="mt-2 flex flex-col gap-1 text-sm">
              {summary.topContexts.slice(0, 4).map((row) => (
                <li key={row.context} className="flex items-baseline justify-between gap-3">
                  <span className="admin-break truncate text-slate-700">{row.context}</span>
                  <span className="font-semibold text-navy-900 tabular-nums">{row.total.toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ol>
          )}
          {summary.topProducts.length > 0 ? (
            <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
              Top product:{" "}
              <span className="font-semibold text-slate-700">
                {summary.topProducts[0].name || summary.topProducts[0].slug}
              </span>{" "}
              ({summary.topProducts[0].total.toLocaleString("en-IN")})
            </p>
          ) : null}
        </div>
      </section>

      <Card>
        <CardHeader
          title="Contact clicks"
          description="Every click on a WhatsApp, call or email button on the website — which section, which product and the pre-filled message. The conversation itself arrives through the channel."
        />
        <FilterBar
          basePath={`${BASE}?tab=clicks`}
          query={filters.q}
          placeholder="Search section, product, message or page…"
          hidden={{ tab: "clicks" }}
        >
          <FilterSelect
            name="type"
            value={filters.type ?? ""}
            label="All click types"
            options={leadEventTypes.map((type) => ({ value: type, label: leadEventLabels[type] }))}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>From</span>
            <input
              type="date"
              name="from"
              defaultValue={filters.from}
              max={filters.to || undefined}
              className={cn(controlClass, "h-9 w-full sm:w-auto")}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>To</span>
            <input
              type="date"
              name="to"
              defaultValue={filters.to}
              min={filters.from || undefined}
              className={cn(controlClass, "h-9 w-full sm:w-auto")}
            />
          </label>
        </FilterBar>
        {rows.length === 0 && page > lastPage ? (
          <EmptyState
            icon={<MousePointerClick />}
            title="This page is empty"
            action={
              <ButtonLink
                href={hrefWith(BASE, params, { page: lastPage > 1 ? lastPage : null })}
                variant="secondary"
                size="sm"
              >
                Go to page {lastPage}
              </ButtonLink>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<MousePointerClick />}
            title={filtered ? "No clicks match these filters" : "No contact clicks yet"}
            description={
              filtered
                ? "Try a wider date range or clear the filters."
                : "When visitors tap WhatsApp, call or email buttons on the website, each click is listed here (no cookies or personal data)."
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <TH>Type</TH>
                <TH>Section</TH>
                <TH>Product</TH>
                <TH>Pre-filled message</TH>
                <TH>Page</TH>
                <TH>Came from</TH>
                <TH>When</TH>
                {canDelete ? (
                  <TH align="right">
                    <span className="sr-only">Actions</span>
                  </TH>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const host = referrerHost(row.referrer);
                const utm = [row.utm.source, row.utm.medium, row.utm.campaign].filter(Boolean).join(" / ");
                return (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <TD>
                      <LeadEventLabel type={row.type} />
                    </TD>
                    <TD className="max-w-[180px]">
                      {row.context ? (
                        <span className="admin-break text-sm text-slate-700">{row.context}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TD>
                    <TD className="max-w-[200px]">
                      {row.productName || row.productSlug ? (
                        <span className="admin-break line-clamp-2 text-sm text-slate-700">
                          {row.productName || row.productSlug}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TD>
                    <TD className="max-w-[320px]">
                      {row.message ? (
                        <span className="line-clamp-2 text-sm text-slate-700" title={row.message}>
                          {row.message}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {row.target ? (
                        <span className="admin-break mt-0.5 block text-xs text-slate-500">
                          to {row.type === "email" ? row.target : formatPhone(row.target)}
                        </span>
                      ) : null}
                    </TD>
                    <TD className="max-w-[180px]">
                      {row.pagePath && isSitePath(row.pagePath) ? (
                        <a
                          href={row.pagePath}
                          target="_blank"
                          rel="noopener"
                          className="admin-break inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
                        >
                          {row.pagePath}
                          <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                          <span className="sr-only">(opens the page in a new tab)</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TD>
                    <TD className="max-w-[180px]">
                      <span className="admin-break block text-sm text-slate-700" title={row.referrer || undefined}>
                        {host || "Direct / unknown"}
                      </span>
                      {utm ? (
                        <Badge tone="violet" className="mt-1">
                          utm: {utm}
                        </Badge>
                      ) : null}
                    </TD>
                    <TD className="whitespace-nowrap">
                      <time
                        dateTime={row.createdAt.toISOString()}
                        title={formatDateTime(row.createdAt)}
                        className="text-sm text-slate-600"
                      >
                        {timeAgo(row.createdAt)}
                      </time>
                    </TD>
                    {canDelete ? (
                      <TD align="right">
                        <ConfirmAction
                          action={deleteLeadEvent}
                          fields={{ id: row.id }}
                          title="Delete this click record?"
                          description="Useful for removing your own test clicks. The record is removed from reports permanently."
                          confirmLabel="Delete record"
                          size="icon-sm"
                          ariaLabel={`Delete ${leadEventLabels[row.type].toLowerCase()} from ${formatDateTime(row.createdAt)}`}
                        >
                          <Trash2 />
                        </ConfirmAction>
                      </TD>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {page <= lastPage ? (
          <Pagination basePath={BASE} params={params} page={page} pageSize={CLICKS_PAGE_SIZE} total={total} />
        ) : null}
      </Card>
    </div>
  );
}

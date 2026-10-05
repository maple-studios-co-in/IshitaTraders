import { eq } from "drizzle-orm";
import {
  AlarmClock,
  ArrowDownRight,
  ArrowUpRight,
  CircleCheck,
  CircleDashed,
  ClipboardList,
  ExternalLink,
  Inbox,
  MessageCircle,
  MousePointerClick,
  Package,
  Plus,
} from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/admin/components/ui/button";
import { BarList, DailyChart } from "@/admin/components/ui/charts";
import { Badge, Callout, Card, CardHeader, PageHeader, StatCard } from "@/admin/components/ui/primitives";
import { can } from "@/admin/config/permissions";
import { mergeSection } from "@/admin/content/settings-schema";
import {
  enquiryStatuses,
  enquiryStatusLabels,
  leadEventLabels,
  leadEventTypes,
  messageChannelLabels,
} from "@/admin/content/types";
import { enquiryStatusTone, formInfo } from "@/admin/features/enquiries/presentation";
import { getLastAuditReport } from "@/admin/features/seo/audit-store";
import { formatPhone, pluralize, timeAgo } from "@/admin/lib/format";
import type { SessionUser } from "@/admin/server/auth/session";
import { getDb } from "@/admin/server/db/client";
import { users } from "@/admin/server/db/schema";
import { env } from "@/admin/server/env";
import { cn } from "@/lib/cn";

import { getDashboardData } from "./queries";

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()),
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** The admin home: today's leads, what needs attention, catalogue health and a go-live checklist. */
export async function DashboardView({ user, denied }: { user: SessionUser; denied?: string }) {
  const [data, report, [account]] = await Promise.all([
    getDashboardData(),
    getLastAuditReport().catch(() => null),
    (await getDb()).select({ passwordChangedAt: users.passwordChangedAt }).from(users).where(eq(users.id, user.id)),
  ]);
  const seo = mergeSection("seo", data.storedSettings.get("seo"));
  const social = mergeSection("social", data.storedSettings.get("social"));
  const clicks30 = leadEventTypes.reduce((sum, type) => sum + (data.clicksByType.get(type) ?? 0), 0);
  const delta = data.enquiries7 - data.enquiriesPrev7;
  const openPipeline = (["new", "contacted", "quoted"] as const).reduce(
    (sum, status) => sum + (data.pipeline.get(status) ?? 0),
    0,
  );
  const overdue = data.followUps.filter((item) => item.overdue);

  const checklist = [
    {
      done: Boolean(env.databaseUrl),
      label: "Production database connected",
      hint: env.databaseUrl
        ? "PostgreSQL is connected."
        : "Using the built-in local database. Add DATABASE_URL (Neon) before going live.",
      href: "/admin/integrations",
    },
    {
      done: Boolean(env.resendApiKey && env.contactFromEmail),
      label: "Email alerts for new enquiries",
      hint: "Connect Resend so each enquiry reaches your inbox too.",
      href: "/admin/integrations",
    },
    {
      done: data.liveSamples === 0,
      label: "Real customer reviews only",
      hint: `${pluralize(data.liveSamples, "sample review")} still live.`,
      href: "/admin/testimonials",
    },
    {
      done: Object.values(social).some(Boolean),
      label: "Social media links added",
      hint: "Footer icons are not linked yet.",
      href: "/admin/content?section=social",
    },
    {
      done: Boolean(seo.googleVerification),
      label: "Google Search Console verified",
      hint: "Paste the verification code under SEO.",
      href: "/admin/seo",
    },
    {
      done: Boolean(seo.gaMeasurementId),
      label: "Google Analytics connected",
      hint: "Add your GA4 measurement ID.",
      href: "/admin/seo",
    },
    {
      done: Boolean(report && report.score >= 80),
      label: "SEO audit score 80+",
      hint: report ? `Last score ${report.score}/100.` : "Run the first audit.",
      href: "/admin/seo/audit",
    },
    {
      done: Boolean(env.whatsappVerifyToken && env.whatsappAppSecret) || data.hasWebhookMessages,
      label: "WhatsApp messages flowing into the inbox",
      hint: "Connect the WhatsApp Cloud API webhook.",
      href: "/admin/integrations",
    },
    {
      done: Boolean(account?.passwordChangedAt),
      label: "Your password changed from the setup one",
      hint: "Choose a personal password.",
      href: "/admin/account",
    },
  ];
  const checklistDone = checklist.filter((item) => item.done).length;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        description={new Intl.DateTimeFormat("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        }).format(new Date())}
        actions={
          <>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-navy-900"
            >
              <ExternalLink className="size-4" aria-hidden="true" /> View website
            </a>
            {can(user.role, "products:write") ? (
              <ButtonLink href="/admin/products/new">
                <Plus aria-hidden="true" /> Add product
              </ButtonLink>
            ) : null}
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {denied ? (
          <Callout tone="warning" title="You don’t have access to that page">
            Your role doesn’t include “{denied}”. Ask an owner or admin if you need it.
          </Callout>
        ) : null}
        {overdue.length ? (
          <Callout tone="danger" icon={<AlarmClock />} title={`${pluralize(overdue.length, "follow-up")} overdue`}>
            {overdue.map((item, index) => (
              <span key={item.id}>
                {index ? ", " : ""}
                <Link href={`/admin/enquiries/${item.id}`} className="font-semibold underline">
                  {item.name || "Visitor"}
                </Link>
              </span>
            ))}
          </Callout>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Enquiries · last 7 days"
            value={data.enquiries7}
            icon={<ClipboardList />}
            href="/admin/enquiries"
            hint={
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-semibold",
                  delta > 0 ? "text-leaf-700" : delta < 0 ? "text-red-600" : "text-slate-500",
                )}
              >
                {delta > 0 ? (
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                ) : delta < 0 ? (
                  <ArrowDownRight className="size-3.5" aria-hidden="true" />
                ) : null}
                {delta === 0
                  ? "Same as the week before"
                  : `${Math.abs(delta)} ${delta > 0 ? "more" : "fewer"} than the week before`}
              </span>
            }
          />
          <StatCard
            label="Unread enquiries"
            value={data.unreadEnquiries}
            icon={<Inbox />}
            tone="blue"
            href="/admin/enquiries?unread=1"
            hint={`${openPipeline} open in the pipeline`}
          />
          <StatCard
            label="Unread messages"
            value={data.unreadMessages}
            icon={<MessageCircle />}
            tone="leaf"
            href="/admin/inbox"
            hint="WhatsApp, email & SMS"
          />
          <StatCard
            label="Contact clicks · 30 days"
            value={clicks30}
            icon={<MousePointerClick />}
            tone="amber"
            href="/admin/inbox?tab=clicks"
            hint={leadEventTypes
              .map((type) => `${data.clicksByType.get(type) ?? 0} ${leadEventLabels[type].split(" ")[0]}`)
              .join(" · ")}
          />
        </div>

        <Card>
          <CardHeader
            title="Leads · last 30 days"
            description="Form enquiries (columns) and taps on WhatsApp / call / email buttons (line)."
          />
          <div className="px-5 pt-4 pb-5">
            <DailyChart
              bars={data.enquirySeries}
              line={data.clickSeries}
              barLabel="Enquiries"
              lineLabel="Contact clicks"
            />
          </div>
        </Card>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader
              title="Latest enquiries"
              actions={
                <Link href="/admin/enquiries" className="text-sm font-semibold text-brand-600 hover:underline">
                  All enquiries →
                </Link>
              }
            />
            {data.recentEnquiries.length ? (
              <ul className="divide-y divide-slate-100">
                {data.recentEnquiries.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/admin/enquiries/${row.id}`}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50"
                    >
                      <span
                        className={cn(
                          "mt-2 size-2 shrink-0 rounded-full",
                          row.isRead ? "bg-slate-200" : "bg-brand-500",
                        )}
                        aria-label={row.isRead ? undefined : "Unread"}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className={cn("text-sm text-navy-950", row.isRead ? "font-semibold" : "font-bold")}>
                            {row.name || "Visitor"}
                          </span>
                          <span className="text-xs text-slate-500">{formInfo(row.formKey, row.formName).name}</span>
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {row.productName ? `${row.productName} · ` : ""}
                          {row.message || (row.phone ? formatPhone(row.phone) : row.email)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <Badge tone={enquiryStatusTone[row.status]}>{enquiryStatusLabels[row.status]}</Badge>
                        <span className="text-[11px] text-slate-400">{timeAgo(row.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No enquiries yet — they appear here the moment a visitor submits a form.
              </p>
            )}
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader title="Pipeline" description="All enquiries by status." />
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-b-xl bg-slate-100">
                {enquiryStatuses.map((status) => (
                  <Link
                    key={status}
                    href={`/admin/enquiries?status=${status}`}
                    className="bg-white px-3 py-3 text-center hover:bg-slate-50"
                  >
                    <span className="block font-display text-xl font-extrabold text-navy-950">
                      {data.pipeline.get(status) ?? 0}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{enquiryStatusLabels[status]}</span>
                  </Link>
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader title="Follow-ups due" description="Today, tomorrow and overdue." />
              {data.followUps.length ? (
                <ul className="divide-y divide-slate-100">
                  {data.followUps.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/admin/enquiries/${item.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-slate-50"
                      >
                        <span className="min-w-0 truncate font-medium text-slate-800">{item.name || "Visitor"}</span>
                        <span
                          className={cn(
                            "shrink-0 text-xs",
                            item.overdue ? "font-semibold text-red-600" : "text-slate-500",
                          )}
                        >
                          {item.followUpAt ? timeAgo(item.followUpAt) : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-5 text-sm text-slate-500">Nothing due. Set a follow-up date on any enquiry.</p>
              )}
            </Card>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Enquiries by form · 30 days" />
            <div className="p-5">
              <BarList
                items={data.byForm
                  .map((row) => ({
                    label: formInfo(row.formKey, row.formName).name,
                    value: row.total,
                    href: `/admin/enquiries?form=${row.formKey}`,
                  }))
                  .sort((a, b) => b.value - a.value)}
                emptyLabel="No enquiries in the last 30 days."
              />
            </div>
          </Card>
          <Card>
            <CardHeader
              title="Most enquired products · 30 days"
              description="By WhatsApp / call taps on product cards."
            />
            <div className="p-5">
              <BarList
                items={data.topProducts.map((row) => ({
                  label: row.name,
                  value: row.total,
                  href: row.id ? `/admin/products/${row.id}` : undefined,
                }))}
                emptyLabel="No product clicks recorded yet."
              />
            </div>
          </Card>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Latest messages"
              actions={
                <Link href="/admin/inbox" className="text-sm font-semibold text-brand-600 hover:underline">
                  Inbox →
                </Link>
              }
            />
            {data.recentMessages.length ? (
              <ul className="divide-y divide-slate-100">
                {data.recentMessages.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/admin/inbox/${row.id}`}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50"
                    >
                      <Badge tone={row.channel === "whatsapp" ? "leaf" : row.channel === "email" ? "blue" : "slate"}>
                        {messageChannelLabels[row.channel]}
                      </Badge>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm text-navy-950",
                            row.isRead ? "font-semibold" : "font-bold",
                          )}
                        >
                          {row.contactName || (row.contactPhone ? formatPhone(row.contactPhone) : "Unknown")}
                        </span>
                        <span className="block truncate text-xs text-slate-500">{row.body}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(row.occurredAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No messages yet. Connect WhatsApp, email or SMS in Integrations, or log a phone call in the inbox.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Catalogue health"
              actions={
                <Link href="/admin/products" className="text-sm font-semibold text-brand-600 hover:underline">
                  Products →
                </Link>
              }
            />
            <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl bg-slate-100 text-sm">
              {[
                {
                  label: "Published",
                  value: data.catalogue.published,
                  href: "/admin/products?status=published",
                  tone: "text-navy-950",
                },
                {
                  label: "Hidden",
                  value: data.catalogue.hidden,
                  href: "/admin/products?status=hidden",
                  tone: "text-slate-600",
                },
                {
                  label: "Enquiry-only (no price)",
                  value: data.catalogue.noPrice,
                  href: "/admin/products?status=no-price",
                  tone: "text-slate-600",
                },
                {
                  label: "Out of stock",
                  value: data.catalogue.outOfStock,
                  href: "/admin/products?stock=out_of_stock",
                  tone: data.catalogue.outOfStock ? "text-red-600" : "text-slate-600",
                },
                {
                  label: "Without an image",
                  value: data.catalogue.noImage,
                  href: "/admin/products",
                  tone: data.catalogue.noImage ? "text-amber-700" : "text-slate-600",
                },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="flex h-full flex-col bg-white px-4 py-3 hover:bg-slate-50">
                    <span className={cn("font-display text-xl font-extrabold", item.tone)}>{item.value}</span>
                    <span className="text-xs text-slate-500">{item.label}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/admin/products/prices"
                  className="flex h-full items-center gap-2 bg-white px-4 py-3 text-xs font-semibold text-brand-600 hover:bg-slate-50"
                >
                  <Package className="size-4" aria-hidden="true" /> Update prices & stock →
                </Link>
              </li>
            </ul>
          </Card>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Go-live checklist" description={`${checklistDone} of ${checklist.length} done`} />
            <div className="px-5 pt-3">
              <div
                className="h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={checklistDone}
                aria-valuemin={0}
                aria-valuemax={checklist.length}
                aria-label="Checklist progress"
              >
                <div
                  className="h-full rounded-full bg-leaf-600"
                  style={{ width: `${(checklistDone / checklist.length) * 100}%` }}
                />
              </div>
            </div>
            <ul className="flex flex-col p-3">
              {checklist.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                    {item.done ? (
                      <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-leaf-600" aria-label="Done" />
                    ) : (
                      <CircleDashed className="mt-0.5 size-[18px] shrink-0 text-slate-400" aria-label="To do" />
                    )}
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm font-semibold",
                          item.done ? "text-slate-500 line-through decoration-slate-300" : "text-slate-800",
                        )}
                      >
                        {item.label}
                      </span>
                      {!item.done ? <span className="block text-xs text-slate-500">{item.hint}</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {can(user.role, "activity:read") ? (
            <Card>
              <CardHeader
                title="Recent activity"
                actions={
                  <Link href="/admin/activity" className="text-sm font-semibold text-brand-600 hover:underline">
                    Activity log →
                  </Link>
                }
              />
              {data.recentActivity.length ? (
                <ul className="divide-y divide-slate-100">
                  {data.recentActivity.map((entry) => (
                    <li key={entry.id} className="px-5 py-2.5 text-sm">
                      <p className="text-slate-800">{entry.summary}</p>
                      <p className="text-xs text-slate-500">
                        {entry.actorName.replace(/\s*<.*>$/, "")} · {timeAgo(entry.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-slate-500">No activity yet.</p>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

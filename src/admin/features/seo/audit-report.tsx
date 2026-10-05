import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  CircleX,
  ExternalLink,
  Info,
  PartyPopper,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/admin/components/ui/button";
import { hrefWith, type SearchParams } from "@/admin/components/ui/listing";
import {
  Badge,
  Callout,
  Card,
  CardHeader,
  EmptyState,
  LinkTabs,
  Table,
  TD,
  TH,
} from "@/admin/components/ui/primitives";
import { formatBytes, formatDateTime, pluralize, timeAgo } from "@/admin/lib/format";
import { cn } from "@/lib/cn";

import {
  auditCategories,
  auditSeverities,
  scoreLabel,
  scoreTone,
  severityMeta,
  type AuditCategory,
  type AuditIssue,
  type AuditPageResult,
  type AuditReport,
  type AuditSeverity,
  type ScoreTone,
} from "./audit-types";

const BASE_PATH = "/admin/seo/audit";

const toneText: Record<ScoreTone, string> = { red: "text-red-600", amber: "text-amber-600", leaf: "text-leaf-700" };
const toneStroke: Record<ScoreTone, string> = {
  red: "stroke-red-500",
  amber: "stroke-amber-500",
  leaf: "stroke-leaf-500",
};
const toneFill: Record<ScoreTone, string> = { red: "bg-red-500", amber: "bg-amber-500", leaf: "bg-leaf-500" };

const severityStyle: Record<AuditSeverity, { icon: LucideIcon; iconClass: string; dot: string }> = {
  error: { icon: CircleX, iconClass: "text-red-600", dot: "bg-red-500" },
  warning: { icon: TriangleAlert, iconClass: "text-amber-600", dot: "bg-amber-500" },
  notice: { icon: Info, iconClass: "text-brand-600", dot: "bg-brand-500" },
};

/* ------------------------------------------------------------------ gauge */

export function ScoreGauge({ score, className }: { score: number; className?: string }) {
  const tone = scoreTone(score);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      role="img"
      aria-label={`SEO score ${score} out of 100: ${scoreLabel(score)}`}
      className={cn("relative size-36 shrink-0", className)}
    >
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="11" className="stroke-slate-100" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(100, score)) / 100)}
          className={toneStroke[tone]}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="font-display text-4xl leading-none font-extrabold tracking-tight text-navy-950">{score}</span>
        <span className="mt-1 text-xs font-medium text-slate-500">of 100</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- overview */

export function AuditOverview({ report }: { report: AuditReport }) {
  const tone = scoreTone(report.score);
  const loadedPages = report.pages.filter((page) => page.status !== null && page.status < 400).length;
  const stats: { label: string; value: number; dot: string }[] = [
    { label: severityMeta.error.plural, value: report.counts.error, dot: severityStyle.error.dot },
    { label: severityMeta.warning.plural, value: report.counts.warning, dot: severityStyle.warning.dot },
    { label: severityMeta.notice.plural, value: report.counts.notice, dot: severityStyle.notice.dot },
    { label: "Passed", value: report.counts.passed, dot: "bg-leaf-500" },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
        <ScoreGauge score={report.score} />
        <div className="min-w-0 flex-1">
          <p className={cn("font-display text-xl font-extrabold", toneText[tone])}>{scoreLabel(report.score)}</p>
          <p className="mt-1 text-sm text-slate-600">
            Last run <time dateTime={report.finishedAt}>{formatDateTime(report.finishedAt)}</time> (
            {timeAgo(report.finishedAt)}){report.runBy ? <> by {report.runBy}</> : null} · took{" "}
            {(report.durationMs / 1000).toFixed(1)} s
          </p>
          <p className="mt-0.5 text-sm break-all text-slate-500">
            Audited{" "}
            <a
              href={report.origin}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-600 hover:underline"
            >
              {report.origin}
            </a>{" "}
            · {pluralize(loadedPages, "page")} crawled · {pluralize(report.links.checked, "internal link")} checked
            {report.links.skipped > 0 ? ` (${report.links.skipped} skipped to keep the audit short)` : ""}
            {report.links.broken > 0 ? ` · ${report.links.broken} broken` : ""}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span aria-hidden="true" className={cn("size-2 rounded-full", stat.dot)} />
                  {stat.label}
                </dt>
                <dd className="mt-0.5 font-display text-xl font-extrabold text-navy-950 tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {report.environment === "development" ? (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs leading-relaxed text-slate-500 sm:px-6">
          Ran against the development server, which renders pages on demand: page sizes and response times differ from
          the live site. Run the audit again on the live site after publishing.
        </div>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------- categories */

export function CategoryScores({
  report,
  params,
  active,
}: {
  report: AuditReport;
  params: SearchParams;
  active: AuditCategory | null;
}) {
  return (
    <section aria-labelledby="audit-categories" className="flex flex-col gap-3">
      <h2 id="audit-categories" className="sr-only">
        Scores by area
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {report.categories.map((item) => {
          const tone = scoreTone(item.score);
          const problems = [
            item.errors ? pluralize(item.errors, "error") : null,
            item.warnings ? pluralize(item.warnings, "warning") : null,
            item.notices ? pluralize(item.notices, "notice") : null,
          ].filter(Boolean);
          const isActive = active === item.category;
          return (
            <Link
              key={item.category}
              href={`${hrefWith(BASE_PATH, params, { category: isActive ? null : item.category })}#issues`}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "group rounded-xl border bg-white p-4 shadow-card transition-[border-color,box-shadow]",
                "hover:border-navy-800/40 hover:shadow-[0_12px_30px_-18px_rgb(0_35_111/0.4)]",
                isActive ? "border-navy-800 ring-2 ring-navy-800/15" : "border-slate-200",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-slate-700">{item.category}</span>
                <span className={cn("font-display text-2xl font-extrabold tabular-nums", toneText[tone])}>
                  {item.score}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <div
                  className={cn("h-full rounded-full", toneFill[tone])}
                  style={{ width: `${Math.max(item.score, 2)}%` }}
                />
              </div>
              <p className="mt-2 truncate text-xs text-slate-500">
                {problems.length
                  ? problems.join(" · ")
                  : item.passed
                    ? `All ${item.passed} checks passed`
                    : "Nothing to check"}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- issues */

export function IssuesCard({
  report,
  params,
  active,
}: {
  report: AuditReport;
  params: SearchParams;
  active: AuditCategory | null;
}) {
  const issues = active ? report.issues.filter((issue) => issue.category === active) : report.issues;
  const counts = new Map<AuditCategory, number>();
  for (const issue of report.issues) counts.set(issue.category, (counts.get(issue.category) ?? 0) + 1);
  const tabs = [
    {
      label: "All",
      href: `${hrefWith(BASE_PATH, params, { category: null })}#issues`,
      active: !active,
      count: report.issues.length,
    },
    ...auditCategories
      .filter((category) => counts.has(category) || category === active)
      .map((category) => ({
        label: category,
        href: `${hrefWith(BASE_PATH, params, { category })}#issues`,
        active: active === category,
        count: counts.get(category) ?? 0,
      })),
  ];

  return (
    <section id="issues" aria-label="Issues" className="scroll-mt-24">
      <Card>
        <CardHeader
          title="Issues"
          description={
            report.issues.length
              ? `${pluralize(report.issues.length, "thing")} to look at, most important first. “Fix” opens the admin page where it’s changed.`
              : "Nothing to fix — every check passed."
          }
        />
        <SeverityLegend />
        {report.issues.length > 0 ? <LinkTabs items={tabs} className="mx-0 px-4" /> : null}
        {issues.length === 0 ? (
          <EmptyState
            icon={<PartyPopper />}
            title={active ? `No issues in “${active}”` : "No issues found"}
            description={active ? "Everything in this area passed." : "The site passed every check in this audit."}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {auditSeverities.map((severity) => {
              const group = issues.filter((issue) => issue.severity === severity);
              if (group.length === 0) return null;
              return (
                <section key={severity} aria-labelledby={`issues-${severity}`}>
                  <h3
                    id={`issues-${severity}`}
                    className="flex items-center gap-2 bg-slate-50/80 px-5 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase"
                  >
                    <span aria-hidden="true" className={cn("size-2 rounded-full", severityStyle[severity].dot)} />
                    {severityMeta[severity].plural} · {group.length}
                  </h3>
                  <ul className="divide-y divide-slate-100">
                    {group.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} origin={report.origin} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}

/** What error, warning and notice mean (shown above the issue list and before the first run). */
export function SeverityLegend({ className }: { className?: string }) {
  return (
    <dl className={cn("grid gap-3 border-b border-slate-100 px-5 py-3 sm:grid-cols-3", className)}>
      {auditSeverities.map((severity) => {
        const Icon = severityStyle[severity].icon;
        return (
          <div key={severity} className="flex gap-2">
            <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", severityStyle[severity].iconClass)} />
            <div>
              <dt className="text-xs font-semibold text-slate-700">{severityMeta[severity].label}</dt>
              <dd className="text-xs leading-relaxed text-slate-500">{severityMeta[severity].description}</dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}

function IssueRow({ issue, origin }: { issue: AuditIssue; origin: string }) {
  const { icon: Icon, iconClass } = severityStyle[issue.severity];
  const pageHref = safePageHref(issue.url, origin);
  const fixHref = issue.fix?.href.startsWith("/admin") ? issue.fix.href : null;
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 gap-3">
        <Icon aria-hidden="true" className={cn("mt-0.5 size-[18px] shrink-0", iconClass)} />
        <div className="min-w-0">
          <p className="font-semibold break-words text-slate-800">
            <span className="sr-only">{severityMeta[issue.severity].label}: </span>
            {issue.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed break-words text-slate-600">{issue.detail}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{issue.category}</Badge>
            {pageHref ? (
              <a
                href={pageHref}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-break inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                {issue.url}
                <ExternalLink aria-hidden="true" className="size-3" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
      {issue.fix && fixHref ? (
        <ButtonLink href={fixHref} variant="secondary" size="sm" className="self-start sm:ml-4">
          {issue.fix.label}
          <ArrowRight aria-hidden="true" />
        </ButtonLink>
      ) : null}
    </li>
  );
}

/** Only same-site paths and http(s) URLs become links. */
function safePageHref(url: string | undefined, origin: string) {
  if (!url) return null;
  try {
    if (url.startsWith("/") && !url.startsWith("//")) return new URL(url, origin).toString();
    return /^https?:\/\//i.test(url) ? url : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ pages */

const inRange = (value: number, min: number, max: number) => value >= min && value <= max;

export function PagesTable({ report }: { report: AuditReport }) {
  return (
    <Card>
      <CardHeader
        title="Pages crawled"
        description="What a search engine saw on each page. Ideal: title 30–65 characters, description 70–160, one H1, every image with alt text."
      />
      <Table className="[&_table]:min-w-[860px]">
        <thead>
          <tr>
            <TH>Page</TH>
            <TH>Status</TH>
            <TH align="right">Title</TH>
            <TH align="right">Description</TH>
            <TH align="center">H1</TH>
            <TH align="right">Images without alt</TH>
            <TH align="right">Size</TH>
            <TH align="right">Time</TH>
          </tr>
        </thead>
        <tbody>
          {report.pages.map((page) => (
            <PageRow key={page.url} page={page} origin={report.origin} />
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function PageRow({ page, origin }: { page: AuditPageResult; origin: string }) {
  const failed = page.status === null || page.status >= 400;
  const href = safePageHref(page.url, origin);
  return (
    <tr className="hover:bg-slate-50/60">
      <TD>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-break font-semibold text-navy-900 hover:text-brand-600 hover:underline"
          >
            {page.url}
          </a>
        ) : (
          <span className="font-semibold text-navy-900">{page.url}</span>
        )}
        <span className="block text-xs text-slate-500">
          {page.label}
          {page.redirectedTo ? ` · redirects to ${page.redirectedTo}` : ""}
        </span>
      </TD>
      <TD>
        {page.status === null ? (
          <Badge tone="red" dot>
            <span title={page.error}>Failed</span>
          </Badge>
        ) : (
          <Badge tone={page.status >= 400 ? "red" : page.redirectedTo || page.status >= 300 ? "amber" : "leaf"} dot>
            {page.status}
          </Badge>
        )}
        {page.noindex ? (
          <Badge tone="slate" className="ml-1">
            noindex
          </Badge>
        ) : null}
      </TD>
      {failed ? (
        <TD className="text-xs text-slate-500" align="right">
          <span className="block max-w-56 truncate" title={page.error}>
            {page.error ?? "Not audited"}
          </span>
        </TD>
      ) : (
        <TD align="right">
          <Measure
            value={page.titleLength}
            good={inRange(page.titleLength, 30, 65)}
            missing={!page.title}
            title={page.title ?? undefined}
          />
        </TD>
      )}
      <TD align="right">
        {failed ? (
          <Dash />
        ) : (
          <Measure
            value={page.descriptionLength}
            good={inRange(page.descriptionLength, 70, 160)}
            missing={!page.description}
            title={page.description ?? undefined}
          />
        )}
      </TD>
      <TD align="center">
        {failed ? (
          <Dash />
        ) : (
          <span
            className={cn(
              "font-semibold tabular-nums",
              page.h1Count === 1 ? "text-leaf-700" : page.h1Count === 0 ? "text-red-600" : "text-amber-600",
            )}
          >
            {page.h1Count}
          </span>
        )}
      </TD>
      <TD align="right">
        {failed ? (
          <Dash />
        ) : (
          <span className="tabular-nums">
            <span className={cn("font-semibold", page.imagesMissingAlt > 0 ? "text-amber-600" : "text-leaf-700")}>
              {page.imagesMissingAlt}
            </span>
            <span className="text-slate-400"> / {page.images}</span>
          </span>
        )}
      </TD>
      <TD align="right" className="whitespace-nowrap tabular-nums">
        {page.bytes ? formatBytes(page.bytes) : <Dash />}
      </TD>
      <TD align="right" className="whitespace-nowrap tabular-nums">
        {(page.timeMs / 1000).toFixed(1)} s
      </TD>
    </tr>
  );
}

function Measure({ value, good, missing, title }: { value: number; good: boolean; missing: boolean; title?: string }) {
  if (missing) return <span className="font-semibold text-red-600">Missing</span>;
  return (
    <span title={title} className={cn("font-semibold tabular-nums", good ? "text-leaf-700" : "text-amber-600")}>
      {value} <span className="font-normal text-slate-400">chars</span>
    </span>
  );
}

const Dash = () => <span className="text-slate-300">—</span>;

/* ----------------------------------------------------------------- passed */

export function PassedChecks({ report }: { report: AuditReport }) {
  if (report.passed.length === 0) return null;
  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-slate-50/70 [&::-webkit-details-marker]:hidden">
          <CircleCheck aria-hidden="true" className="size-5 text-leaf-600" />
          <span className="flex-1">
            <span className="block font-display text-base font-bold text-navy-950">Passed checks</span>
            <span className="block text-sm text-slate-500">What’s already in good shape.</span>
          </span>
          <Badge tone="leaf">{report.passed.length}</Badge>
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-slate-400 transition-transform group-open:rotate-180"
          />
        </summary>
        <ul className="grid gap-x-8 gap-y-2.5 border-t border-slate-100 px-5 py-4 md:grid-cols-2">
          {report.passed.map((check) => (
            <li key={`${check.category}-${check.id}-${check.title}`} className="flex gap-2 text-sm">
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-leaf-600" />
              <span className="min-w-0">
                <span className="font-medium text-slate-800">{check.title}</span>
                {check.detail ? <span className="text-slate-500"> · {check.detail}</span> : null}
                <span className="block text-xs text-slate-400">{check.category}</span>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

/* ----------------------------------------------------------- whole report */

export function AuditReportView({
  report,
  params,
  active,
}: {
  report: AuditReport;
  params: SearchParams;
  active: AuditCategory | null;
}) {
  const failedPages = report.pages.filter((page) => page.status === null).length;
  return (
    <div className="flex flex-col gap-6">
      <AuditOverview report={report} />
      {failedPages === report.pages.length && report.pages.length > 0 ? (
        <Callout tone="danger" title="The website couldn’t be reached">
          None of the pages responded ({report.pages[0]?.error ?? "no response"}). Check that the site is running at{" "}
          {report.origin} and run the audit again.
        </Callout>
      ) : null}
      <CategoryScores report={report} params={params} active={active} />
      <IssuesCard report={report} params={params} active={active} />
      <PagesTable report={report} />
      <PassedChecks report={report} />
    </div>
  );
}

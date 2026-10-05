/**
 * SEO audit report shapes and scoring vocabulary (client-safe). The report is produced by
 * `audit.ts`, stored as JSON in the `settings` row `__seo_audit` and rendered by the audit page.
 */

/** Internal settings key (keys starting with "__" are never shown as site settings). */
export const AUDIT_SETTINGS_KEY = "__seo_audit";

export const auditSeverities = ["error", "warning", "notice"] as const;
export type AuditSeverity = (typeof auditSeverities)[number];

export const auditCategories = [
  "Meta tags",
  "Content",
  "Technical",
  "Social",
  "Structured data",
  "Performance",
  "Catalogue",
  "Trust",
] as const;
export type AuditCategory = (typeof auditCategories)[number];

/** Where in the admin the problem is fixed. */
export interface AuditFix {
  label: string;
  href: string;
}

export interface AuditIssue {
  /** Stable id: the rule plus what it was found on. */
  id: string;
  /** The check that raised it; repeats of one rule weigh less in the score. */
  rule: string;
  severity: AuditSeverity;
  category: AuditCategory;
  title: string;
  detail: string;
  /** Page the issue was found on: a path on the audited site, or an absolute URL. */
  url?: string;
  fix?: AuditFix;
}

export interface AuditPassedCheck {
  id: string;
  category: AuditCategory;
  title: string;
  detail?: string;
}

export interface AuditPageResult {
  /** Path on the audited site. */
  url: string;
  label: string;
  /** HTTP status, or null when the request failed (timeout, connection refused…). */
  status: number | null;
  error?: string;
  /** Final path when the page redirected. */
  redirectedTo?: string;
  timeMs: number;
  bytes: number;
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  h1Count: number;
  canonical: string | null;
  lang: string | null;
  images: number;
  imagesMissingAlt: number;
  jsonLdBlocks: number;
  jsonLdTypes: string[];
  internalLinks: number;
  words: number;
  noindex: boolean;
}

export interface AuditCategoryResult {
  category: AuditCategory;
  score: number;
  errors: number;
  warnings: number;
  notices: number;
  passed: number;
}

export interface AuditReport {
  version: 1;
  origin: string;
  environment: "production" | "development";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  /** 0–100. */
  score: number;
  counts: Record<AuditSeverity, number> & { passed: number };
  categories: AuditCategoryResult[];
  issues: AuditIssue[];
  passed: AuditPassedCheck[];
  pages: AuditPageResult[];
  links: { found: number; checked: number; broken: number; skipped: number };
  runBy: string;
}

/* ---------------------------------------------------------------- scoring */

export const severityMeta: Record<
  AuditSeverity,
  { label: string; plural: string; description: string; penalty: number }
> = {
  error: {
    label: "Error",
    plural: "Errors",
    description: "Breaks a page or keeps it out of search results. Fix these first.",
    penalty: 10,
  },
  warning: {
    label: "Warning",
    plural: "Warnings",
    description: "Costs rankings, clicks or trust. Worth fixing soon.",
    penalty: 4,
  },
  notice: {
    label: "Notice",
    plural: "Notices",
    description: "Small improvements and missed opportunities.",
    penalty: 1,
  },
};

/** How much each area matters: scales error (8–12) and warning (3–5) penalties. Notices always cost 1. */
export const categoryWeight: Record<AuditCategory, number> = {
  "Meta tags": 1.1,
  Content: 1,
  Technical: 1.2,
  Social: 0.8,
  "Structured data": 0.9,
  Performance: 1,
  Catalogue: 0.9,
  Trust: 1,
};

export const severityRank: Record<AuditSeverity, number> = { error: 0, warning: 1, notice: 2 };

export function issuePenalty(issue: Pick<AuditIssue, "severity" | "category">) {
  if (issue.severity === "notice") return severityMeta.notice.penalty;
  return severityMeta[issue.severity].penalty * categoryWeight[issue.category];
}

export type ScoreTone = "red" | "amber" | "leaf";

export function scoreTone(score: number): ScoreTone {
  if (score >= 80) return "leaf";
  if (score >= 50) return "amber";
  return "red";
}

export function scoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 50) return "Needs work";
  return "Poor";
}

/** Loose structural check for a stored report (older or hand-edited rows are ignored). */
export function isAuditReport(value: unknown): value is AuditReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<AuditReport>;
  return (
    report.version === 1 &&
    typeof report.score === "number" &&
    typeof report.origin === "string" &&
    typeof report.finishedAt === "string" &&
    Array.isArray(report.issues) &&
    Array.isArray(report.passed) &&
    Array.isArray(report.pages) &&
    Array.isArray(report.categories)
  );
}

export function isAuditCategory(value: string): value is AuditCategory {
  return (auditCategories as readonly string[]).includes(value);
}

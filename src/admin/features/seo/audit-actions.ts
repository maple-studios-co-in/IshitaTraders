"use server";

import { headers } from "next/headers";

import type { ActionState } from "@/admin/lib/action-state";
import { pluralize } from "@/admin/lib/format";
import { FormError, runAction } from "@/admin/server/action";
import { diff, logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { env } from "@/admin/server/env";
import { rateLimit } from "@/admin/server/security/rate-limit";
import { siteConfig } from "@/config/site";

import { runSeoAudit } from "./audit";
import { getLastAuditReport, saveAuditReport } from "./audit-store";

/** Hard ceiling for one run (the crawl itself is budgeted to ~20–35 s); the page allows 60 s+. */
const RUN_LIMIT_MS = 55_000;

/**
 * One audit at a time per server instance (each run sends ~80 requests to the site). A timestamp,
 * not a flag, so a run that never finished can't block audits forever.
 */
const globalForAudit = globalThis as unknown as { __ishitaSeoAuditStartedAt?: number };

/** Runs the SEO audit and stores the report. Used with `useActionState`; takes no form fields. */
export async function runAudit(): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("seo:write");
    const running = globalForAudit.__ishitaSeoAuditStartedAt;
    if (running && Date.now() - running < RUN_LIMIT_MS) {
      throw new FormError("An audit is already running. It takes up to 20 seconds — reload the page in a moment.");
    }
    const limit = await rateLimit(`seo-audit:${user.id}`, 12, 15 * 60);
    if (!limit.ok)
      throw new FormError("You’ve run the audit many times in the last few minutes. Please wait a little.");

    const startedAt = Date.now();
    globalForAudit.__ishitaSeoAuditStartedAt = startedAt;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new FormError(
                "The audit took too long and was stopped. Check that the website is responding, then try again.",
              ),
            ),
          RUN_LIMIT_MS,
        );
      });
      const work = async () => {
        const [origin, previous] = await Promise.all([auditOrigin(), getLastAuditReport().catch(() => null)]);
        const report = await runSeoAudit(origin, { runBy: user.name });
        await saveAuditReport(report, user.id);

        const totals = (r: typeof report) => ({
          score: r.score,
          errors: r.counts.error,
          warnings: r.counts.warning,
          notices: r.counts.notice,
        });
        await logActivity(user, {
          action: "seo.audit",
          entityType: "seo",
          entityId: "audit",
          summary: `Ran an SEO audit: score ${report.score}/100 (${pluralize(report.counts.error, "error")}, ${pluralize(report.counts.warning, "warning")}, ${pluralize(report.counts.notice, "notice")})`,
          changes: previous ? diff(totals(previous), totals(report)) : undefined,
        });
        return report;
      };
      const report = await Promise.race([work(), timeout]);
      return `Audit complete — score ${report.score}/100.`;
    } finally {
      clearTimeout(timer);
      if (globalForAudit.__ishitaSeoAuditStartedAt === startedAt) globalForAudit.__ishitaSeoAuditStartedAt = undefined;
    }
  });
}

/**
 * The site to audit. Production audits the public URL; in development the site is whatever host
 * this admin is being served from (e.g. http://localhost:3070), read from the request headers.
 */
async function auditOrigin() {
  const configured = new URL(siteConfig.url).origin;
  if (env.isProduction) return configured;
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0].trim().toLowerCase();
  const validHost = /^(?:\[[0-9a-f:.]+\]|[a-z0-9.-]+)(?::\d{1,5})?$/i.test(host);
  return validHost && (proto === "http" || proto === "https") ? `${proto}://${host}` : configured;
}

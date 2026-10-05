import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { param, type SearchParams } from "@/admin/components/ui/listing";
import { Badge, Callout, Card, PageHeader } from "@/admin/components/ui/primitives";
import { can } from "@/admin/config/permissions";
import { mergeSection } from "@/admin/content/settings-schema";
import { contentSections, type ContentSectionKey } from "@/admin/features/content/sections";
import {
  AnnouncementForm,
  BusinessForm,
  CatalogueForm,
  ContactForm,
  HeroForm,
  HomepageForm,
  NotificationsForm,
  SocialForm,
} from "@/admin/features/content/settings-forms";
import { formatDateTime } from "@/admin/lib/format";
import { requirePermission } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { settings } from "@/admin/server/db/schema";
import { env } from "@/admin/server/env";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Site content" };

const previewLinks: Partial<Record<ContentSectionKey, string>> = {
  hero: "/",
  announcement: "/",
  homepage: "/#solar-range",
  catalogue: "/products",
  social: "/#footer-title",
  business: "/#footer-title",
  contact: "/#contact",
};

export default async function ContentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePermission("content:write");
  const params = await searchParams;
  const sections = contentSections.filter(
    (section) => section.key !== "notifications" || can(user.role, "integrations:manage"),
  );
  const requested = param(params, "section");
  const active = sections.find((section) => section.key === requested) ?? sections[0];

  const db = await getDb();
  const rows = await db
    .select({ key: settings.key, value: settings.value, updatedAt: settings.updatedAt })
    .from(settings);
  const stored = new Map(rows.map((row) => [row.key, row]));
  const row = stored.get(active.key);
  const isCustomised = Boolean(row);

  const form = (() => {
    switch (active.key) {
      case "business":
        return <BusinessForm values={mergeSection("business", row?.value)} isCustomised={isCustomised} />;
      case "contact":
        return <ContactForm values={mergeSection("contact", row?.value)} isCustomised={isCustomised} />;
      case "social":
        return <SocialForm values={mergeSection("social", row?.value)} isCustomised={isCustomised} />;
      case "hero":
        return <HeroForm values={mergeSection("hero", row?.value)} isCustomised={isCustomised} />;
      case "announcement":
        return <AnnouncementForm values={mergeSection("announcement", row?.value)} isCustomised={isCustomised} />;
      case "catalogue":
        return <CatalogueForm values={mergeSection("catalogue", row?.value)} isCustomised={isCustomised} />;
      case "homepage":
        return <HomepageForm values={mergeSection("homepage", row?.value)} isCustomised={isCustomised} />;
      case "notifications":
        return (
          <NotificationsForm
            values={mergeSection("notifications", row?.value)}
            isCustomised={isCustomised}
            emailConfigured={Boolean(env.resendApiKey && env.contactFromEmail)}
          />
        );
    }
  })();

  return (
    <>
      <PageHeader
        title="Site content"
        description="Change the website’s text, numbers, links and images without a developer. Saving updates the live site immediately; every change is recorded in the activity log."
        breadcrumbs={[{ label: "Website" }, { label: "Site content" }]}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Content sections" className="lg:sticky lg:top-24">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {sections.map((section) => (
              <li key={section.key} className="shrink-0">
                <Link
                  href={`/admin/content?section=${section.key}`}
                  aria-current={section.key === active.key ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    section.key === active.key
                      ? "bg-navy-800 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-navy-900",
                  )}
                >
                  {section.label}
                  {stored.has(section.key) ? (
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        section.key === active.key ? "bg-leaf-500" : "bg-leaf-600",
                      )}
                      title="Edited"
                    />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 hidden px-3 text-xs text-slate-500 lg:block">
            <span className="mr-1 inline-block size-1.5 rounded-full bg-leaf-600 align-middle" /> = changed from the
            original design. SEO lives under{" "}
            <Link href="/admin/seo" className="font-semibold text-brand-600 hover:underline">
              SEO &amp; audit
            </Link>
            .
          </p>
        </nav>

        <Card>
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy-950">
                {active.label}
                {isCustomised ? <Badge tone="leaf">Edited</Badge> : <Badge>Original</Badge>}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">{active.description}</p>
              {row ? <p className="mt-1 text-xs text-slate-400">Last saved {formatDateTime(row.updatedAt)}</p> : null}
            </div>
            {previewLinks[active.key] ? (
              <a
                href={previewLinks[active.key]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
              >
                View on website <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </header>
          <div className="p-5">
            {requested && requested !== active.key ? (
              <Callout tone="warning" className="mb-5">
                That section isn’t available to your role.
              </Callout>
            ) : null}
            {form}
          </div>
        </Card>
      </div>
    </>
  );
}

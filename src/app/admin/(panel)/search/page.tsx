import { desc, ilike, or, sql } from "drizzle-orm";
import { ArrowRight, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { controlClass } from "@/admin/components/ui/form-controls";
import { param, type SearchParams } from "@/admin/components/ui/listing";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/admin/components/ui/primitives";
import { adminNav } from "@/admin/config/navigation";
import { can } from "@/admin/config/permissions";
import { enquiryStatusLabels, messageChannelLabels } from "@/admin/content/types";
import { contentSections } from "@/admin/features/content/sections";
import { enquiryStatusTone } from "@/admin/features/enquiries/presentation";
import { formatPhone, timeAgo } from "@/admin/lib/format";
import { requireUser } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { enquiries, faqs, messages, pages, products, testimonials } from "@/admin/server/db/schema";
import { likePattern } from "@/admin/server/query";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Search" };

const LIMIT = 8;

/** One search box for everything: products, leads, messages, pages, content and admin screens. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const q = param(await searchParams, "q").slice(0, 100);
  const pattern = likePattern(q);
  const digits = q.replace(/\D/g, "");

  const db = await getDb();
  const [productRows, enquiryRows, messageRows, pageRows, faqRows, testimonialRows] = q
    ? await Promise.all([
        can(user.role, "products:read")
          ? db
              .select({
                id: products.id,
                name: products.name,
                sku: products.sku,
                subtitle: products.subtitle,
                isPublished: products.isPublished,
              })
              .from(products)
              .where(
                or(
                  ilike(products.name, pattern),
                  ilike(products.sku, pattern),
                  ilike(products.subtitle, pattern),
                  ilike(products.typeLabel, pattern),
                ),
              )
              .limit(LIMIT)
          : [],
        can(user.role, "enquiries:read")
          ? db
              .select({
                id: enquiries.id,
                name: enquiries.name,
                company: enquiries.company,
                phone: enquiries.phone,
                formName: enquiries.formName,
                status: enquiries.status,
                productName: enquiries.productName,
                createdAt: enquiries.createdAt,
              })
              .from(enquiries)
              .where(
                or(
                  ilike(enquiries.name, pattern),
                  ilike(enquiries.email, pattern),
                  ilike(enquiries.company, pattern),
                  ilike(enquiries.message, pattern),
                  ilike(enquiries.productName, pattern),
                  digits.length >= 4
                    ? sql`regexp_replace(${enquiries.phone}, '\\D', '', 'g') like ${`%${digits}%`}`
                    : sql`false`,
                ),
              )
              .orderBy(desc(enquiries.createdAt))
              .limit(LIMIT)
          : [],
        can(user.role, "inbox:read")
          ? db
              .select({
                id: messages.id,
                channel: messages.channel,
                contactName: messages.contactName,
                contactPhone: messages.contactPhone,
                body: messages.body,
                occurredAt: messages.occurredAt,
              })
              .from(messages)
              .where(
                or(
                  ilike(messages.contactName, pattern),
                  ilike(messages.contactEmail, pattern),
                  ilike(messages.subject, pattern),
                  ilike(messages.body, pattern),
                  digits.length >= 4
                    ? sql`regexp_replace(${messages.contactPhone}, '\\D', '', 'g') like ${`%${digits}%`}`
                    : sql`false`,
                ),
              )
              .orderBy(desc(messages.occurredAt))
              .limit(LIMIT)
          : [],
        can(user.role, "pages:write")
          ? db
              .select({ id: pages.id, title: pages.title, slug: pages.slug, status: pages.status })
              .from(pages)
              .where(or(ilike(pages.title, pattern), ilike(pages.slug, pattern)))
              .limit(LIMIT)
          : [],
        can(user.role, "content:write")
          ? db
              .select({ id: faqs.id, question: faqs.question })
              .from(faqs)
              .where(or(ilike(faqs.question, pattern), ilike(faqs.answer, pattern)))
              .limit(LIMIT)
          : [],
        can(user.role, "content:write")
          ? db
              .select({ id: testimonials.id, name: testimonials.name, quote: testimonials.quote })
              .from(testimonials)
              .where(or(ilike(testimonials.name, pattern), ilike(testimonials.quote, pattern)))
              .limit(LIMIT)
          : [],
      ])
    : [[], [], [], [], [], []];

  const needle = q.toLowerCase();
  const screens = q
    ? [
        ...adminNav
          .flatMap((group) => group.items)
          .filter((item) => can(user.role, item.permission) && item.label.toLowerCase().includes(needle))
          .map((item) => ({ label: item.label, href: item.href })),
        ...(can(user.role, "content:write")
          ? contentSections
              .filter((section) => `${section.label} ${section.description}`.toLowerCase().includes(needle))
              .map((section) => ({
                label: `Site content → ${section.label}`,
                href: `/admin/content?section=${section.key}`,
              }))
          : []),
      ].slice(0, LIMIT)
    : [];
  const total =
    productRows.length +
    enquiryRows.length +
    messageRows.length +
    pageRows.length +
    faqRows.length +
    testimonialRows.length +
    screens.length;

  return (
    <>
      <PageHeader title="Search" description="Products, enquiries, messages, pages, FAQs, reviews and admin screens." />
      <form action="/admin/search" method="get" role="search" className="relative mb-6 max-w-2xl">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <label htmlFor="search-page-q" className="sr-only">
          Search
        </label>
        <input
          id="search-page-q"
          type="search"
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Try a name, phone number, product or model…"
          className={cn(controlClass, "h-12 pl-11 text-base")}
        />
      </form>

      {!q ? (
        <EmptyState
          icon={<Search />}
          title="What are you looking for?"
          description="Search by customer name, phone number (any part), email, product, model number or SKU."
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<Search />}
          title={`Nothing found for “${q}”`}
          description="Check the spelling, or try part of a phone number or model code."
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {screens.length ? (
            <ResultCard title="Admin screens">
              {screens.map((item) => (
                <ResultRow key={item.href} href={item.href} title={item.label} />
              ))}
            </ResultCard>
          ) : null}
          {enquiryRows.length ? (
            <ResultCard title="Enquiries">
              {enquiryRows.map((row) => (
                <ResultRow
                  key={row.id}
                  href={`/admin/enquiries/${row.id}`}
                  title={row.name || "Visitor"}
                  meta={[row.company, row.phone ? formatPhone(row.phone) : "", row.productName, row.formName]
                    .filter(Boolean)
                    .join(" · ")}
                  aside={
                    <>
                      <Badge tone={enquiryStatusTone[row.status]}>{enquiryStatusLabels[row.status]}</Badge>
                      <span className="text-[11px] text-slate-400">{timeAgo(row.createdAt)}</span>
                    </>
                  }
                />
              ))}
            </ResultCard>
          ) : null}
          {productRows.length ? (
            <ResultCard title="Products">
              {productRows.map((row) => (
                <ResultRow
                  key={row.id}
                  href={`/admin/products/${row.id}`}
                  title={row.name}
                  meta={[row.sku, row.subtitle].filter(Boolean).join(" · ")}
                  aside={row.isPublished ? null : <Badge>Hidden</Badge>}
                />
              ))}
            </ResultCard>
          ) : null}
          {messageRows.length ? (
            <ResultCard title="Messages">
              {messageRows.map((row) => (
                <ResultRow
                  key={row.id}
                  href={`/admin/inbox/${row.id}`}
                  title={row.contactName || (row.contactPhone ? formatPhone(row.contactPhone) : "Unknown")}
                  meta={row.body.slice(0, 120)}
                  aside={
                    <>
                      <Badge tone="leaf">{messageChannelLabels[row.channel]}</Badge>
                      <span className="text-[11px] text-slate-400">{timeAgo(row.occurredAt)}</span>
                    </>
                  }
                />
              ))}
            </ResultCard>
          ) : null}
          {pageRows.length ? (
            <ResultCard title="HTML pages">
              {pageRows.map((row) => (
                <ResultRow
                  key={row.id}
                  href={`/admin/pages/${row.id}`}
                  title={row.title}
                  meta={`/${row.slug}`}
                  aside={
                    <Badge tone={row.status === "published" ? "leaf" : "slate"}>
                      {row.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  }
                />
              ))}
            </ResultCard>
          ) : null}
          {faqRows.length ? (
            <ResultCard title="FAQs">
              {faqRows.map((row) => (
                <ResultRow key={row.id} href="/admin/faqs" title={row.question} />
              ))}
            </ResultCard>
          ) : null}
          {testimonialRows.length ? (
            <ResultCard title="Testimonials">
              {testimonialRows.map((row) => (
                <ResultRow
                  key={row.id}
                  href="/admin/testimonials"
                  title={row.name}
                  meta={`“${row.quote.slice(0, 100)}”`}
                />
              ))}
            </ResultCard>
          ) : null}
        </div>
      )}
    </>
  );
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <ul className="divide-y divide-slate-100">{children}</ul>
    </Card>
  );
}

function ResultRow({
  href,
  title,
  meta,
  aside,
}: {
  href: string;
  title: string;
  meta?: string;
  aside?: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-navy-950 group-hover:text-brand-600">{title}</span>
          {meta ? <span className="block truncate text-xs text-slate-500">{meta}</span> : null}
        </span>
        {aside ? (
          <span className="flex shrink-0 flex-col items-end gap-1">{aside}</span>
        ) : (
          <ArrowRight className="size-4 shrink-0 text-slate-300 group-hover:text-brand-600" aria-hidden="true" />
        )}
      </Link>
    </li>
  );
}

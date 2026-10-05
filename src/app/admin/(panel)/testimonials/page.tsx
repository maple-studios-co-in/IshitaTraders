import { asc } from "drizzle-orm";
import { EyeOff, Pencil, Star, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { ActionButton } from "@/admin/components/ui/action-button";
import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { Badge, Callout, Card, CardHeader, EmptyState, PageHeader } from "@/admin/components/ui/primitives";
import { ReorderButtons } from "@/admin/components/ui/reorder-buttons";
import { resolveImage } from "@/admin/content/images";
import { testimonialBadgeLabels } from "@/admin/content/types";
import { clearSampleTestimonials, deleteTestimonial, moveTestimonial } from "@/admin/features/testimonials/actions";
import { TestimonialForm } from "@/admin/features/testimonials/testimonial-form";
import { requirePermission } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { testimonials } from "@/admin/server/db/schema";

export const metadata: Metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  await requirePermission("content:write");
  const db = await getDb();
  const rows = await db.select().from(testimonials).orderBy(asc(testimonials.sortOrder), asc(testimonials.createdAt));
  const published = rows.filter((row) => row.isPublished);
  const liveSamples = published.filter((row) => row.isSample).length;
  const samples = rows.filter((row) => row.isSample).length;

  return (
    <>
      <PageHeader
        title="Testimonials"
        description={`Customer reviews in “What Our Clients Say”. The counter on the website shows the number published (now ${published.length}).`}
        breadcrumbs={[{ label: "Website" }, { label: "Testimonials" }]}
      />

      {liveSamples ? (
        <Callout
          tone="warning"
          className="mb-6"
          title={`${liveSamples} sample review${liveSamples === 1 ? " is" : "s are"} live on the website`}
        >
          <p>
            They were added so the carousel reads “/ 25” as designed. Replace them with real customer reviews (edit a
            sample, untick “Sample”), or remove them all.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton action={clearSampleTestimonials} fields={{ mode: "hide" }} pendingLabel="Hiding…">
              <EyeOff aria-hidden="true" /> Hide all samples
            </ActionButton>
            <ConfirmAction
              action={clearSampleTestimonials}
              fields={{ mode: "delete" }}
              title={`Delete all ${samples} sample reviews?`}
              description="Real reviews are kept. The carousel counter will show the number of real reviews."
              confirmLabel="Delete samples"
              variant="danger-ghost"
              size="md"
            >
              <Trash2 aria-hidden="true" /> Delete all samples
            </ConfirmAction>
          </div>
        </Callout>
      ) : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader
            title="Reviews"
            description={`${rows.length} total · ${published.length} published · order = carousel order`}
          />
          {rows.length === 0 ? (
            <EmptyState
              icon={<Star />}
              title="No reviews yet"
              description="Add your first customer review with the form."
            />
          ) : (
            <ol className="divide-y divide-slate-100">
              {rows.map((row, index) => {
                const avatar = resolveImage(row.avatar, row.name);
                return (
                  <li key={row.id}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-slate-50/70 [&::-webkit-details-marker]:hidden">
                        <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-800/10 text-xs font-bold text-navy-800">
                          {avatar ? (
                            <Image src={avatar.src} alt="" fill sizes="40px" className="object-cover" />
                          ) : (
                            row.name.slice(0, 2).toUpperCase()
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-semibold text-slate-800">{row.name}</span>
                            <span className="flex shrink-0" aria-label={`${row.rating} stars`}>
                              {Array.from({ length: row.rating }, (_, i) => (
                                <Star key={i} className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                              ))}
                            </span>
                          </span>
                          <span className="block truncate text-xs text-slate-500">“{row.quote}”</span>
                        </span>
                        <span className="hidden shrink-0 gap-1 sm:flex">
                          {row.isSample ? <Badge tone="amber">Sample</Badge> : null}
                          {row.isPublished ? <Badge tone="leaf">Published</Badge> : <Badge>Hidden</Badge>}
                        </span>
                        <Pencil
                          className="size-4 shrink-0 text-slate-400 group-open:text-navy-800"
                          aria-hidden="true"
                        />
                      </summary>
                      <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                        <p className="text-xs text-slate-500">
                          Badge: {testimonialBadgeLabels[row.badgeKind]}
                          {row.badgeLabel ? ` · “${row.badgeLabel}”` : ""}
                        </p>
                        <TestimonialForm
                          testimonial={{
                            id: row.id,
                            name: row.name,
                            location: row.location,
                            quote: row.quote,
                            rating: row.rating,
                            badgeKind: row.badgeKind,
                            badgeLabel: row.badgeLabel,
                            avatar: row.avatar,
                            isPublished: row.isPublished,
                            isSample: row.isSample,
                          }}
                        />
                        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                          <ReorderButtons
                            action={moveTestimonial}
                            id={row.id}
                            isFirst={index === 0}
                            isLast={index === rows.length - 1}
                            label={row.name}
                          />
                          <ConfirmAction
                            action={deleteTestimonial}
                            fields={{ id: row.id }}
                            title="Delete this review?"
                            description={
                              <>The review by {row.name} will be removed from the website. This can’t be undone.</>
                            }
                            confirmLabel="Delete review"
                          >
                            <Trash2 /> Delete
                          </ConfirmAction>
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <Card className="xl:sticky xl:top-24">
          <CardHeader
            title="Add a review"
            description="Ask happy customers on WhatsApp — a short quote and their town is enough."
          />
          <div className="p-5">
            <TestimonialForm />
          </div>
        </Card>
      </div>
    </>
  );
}

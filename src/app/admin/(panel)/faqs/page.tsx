import { asc } from "drizzle-orm";
import { MessageCircleQuestion, Pencil, Trash2 } from "lucide-react";
import type { Metadata } from "next";

import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/admin/components/ui/primitives";
import { ReorderButtons } from "@/admin/components/ui/reorder-buttons";
import { deleteFaq, moveFaq } from "@/admin/features/faqs/actions";
import { FaqForm } from "@/admin/features/faqs/faq-form";
import { requirePermission } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { faqs } from "@/admin/server/db/schema";

export const metadata: Metadata = { title: "FAQs" };

export default async function FaqsPage() {
  await requirePermission("content:write");
  const db = await getDb();
  const rows = await db.select().from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));

  return (
    <>
      <PageHeader
        title="FAQs"
        description="The questions in the website’s FAQ section. Order here is the order on the site."
        breadcrumbs={[{ label: "Website" }, { label: "FAQs" }]}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader
            title="Questions"
            description={`${rows.length} total · ${rows.filter((row) => row.isPublished).length} published`}
          />
          {rows.length === 0 ? (
            <EmptyState
              icon={<MessageCircleQuestion />}
              title="No questions yet"
              description="Add the first question with the form."
            />
          ) : (
            <ol className="divide-y divide-slate-100">
              {rows.map((faq, index) => (
                <li key={faq.id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 hover:bg-slate-50/70 [&::-webkit-details-marker]:hidden">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-navy-800">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-800">{faq.question}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {faq.answer || "No answer — opens WhatsApp on the website"}
                        </span>
                      </span>
                      {faq.isPublished ? <Badge tone="leaf">Published</Badge> : <Badge>Hidden</Badge>}
                      <Pencil className="size-4 text-slate-400 group-open:text-navy-800" aria-hidden="true" />
                    </summary>
                    <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                      <FaqForm faq={faq} />
                      <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                        <ReorderButtons
                          action={moveFaq}
                          id={faq.id}
                          isFirst={index === 0}
                          isLast={index === rows.length - 1}
                          label={faq.question}
                        />
                        <ConfirmAction
                          action={deleteFaq}
                          fields={{ id: faq.id }}
                          title="Delete this question?"
                          description={<>“{faq.question}” will be removed from the website. This can’t be undone.</>}
                          confirmLabel="Delete question"
                        >
                          <Trash2 /> Delete
                        </ConfirmAction>
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="xl:sticky xl:top-24">
          <CardHeader title="Add a question" />
          <div className="p-5">
            <FaqForm />
          </div>
        </Card>
      </div>
    </>
  );
}

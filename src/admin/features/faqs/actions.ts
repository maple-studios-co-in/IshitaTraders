"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import type { ActionState } from "@/admin/lib/action-state";
import { formValue, parseOrThrow, runAction } from "@/admin/server/action";
import { diff, logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { cacheTags, refreshContent } from "@/admin/server/cache";
import { getDb } from "@/admin/server/db/client";
import { faqs } from "@/admin/server/db/schema";
import { moveRow, nextSortOrder } from "@/admin/server/ordering";

const faqSchema = z.object({
  question: z
    .string()
    .trim()
    .min(8, "Write the question (at least 8 characters).")
    .max(240, "Keep the question under 240 characters."),
  answer: z.string().trim().max(2000, "Keep the answer under 2000 characters."),
  isPublished: z.boolean(),
});

const idSchema = z.string().uuid();

export async function saveFaq(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("content:write");
    const id = formValue.text(formData, "id");
    const values = parseOrThrow(faqSchema, {
      question: formValue.text(formData, "question"),
      answer: formValue.text(formData, "answer"),
      isPublished: formValue.bool(formData, "isPublished"),
    });
    const db = await getDb();

    if (id) {
      const [before] = await db
        .select()
        .from(faqs)
        .where(eq(faqs.id, idSchema.parse(id)));
      if (!before) return "That FAQ no longer exists.";
      await db.update(faqs).set(values).where(eq(faqs.id, before.id));
      await logActivity(user, {
        action: "faq.update",
        entityType: "faq",
        entityId: before.id,
        summary: `Updated FAQ “${values.question}”`,
        changes: diff(before, values),
      });
    } else {
      const [created] = await db
        .insert(faqs)
        .values({ ...values, sortOrder: await nextSortOrder(faqs) })
        .returning({ id: faqs.id });
      await logActivity(user, {
        action: "faq.create",
        entityType: "faq",
        entityId: created.id,
        summary: `Added FAQ “${values.question}”`,
      });
    }

    refreshContent(cacheTags.faqs);
    return id ? "FAQ updated." : "FAQ added.";
  });
}

export async function deleteFaq(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("content:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    const [deleted] = await db.delete(faqs).where(eq(faqs.id, id)).returning({ question: faqs.question });
    if (deleted) {
      await logActivity(user, {
        action: "faq.delete",
        entityType: "faq",
        entityId: id,
        summary: `Deleted FAQ “${deleted.question}”`,
      });
      refreshContent(cacheTags.faqs);
    }
    return "FAQ deleted.";
  });
}

export async function moveFaq(formData: FormData) {
  await assertPermission("content:write");
  const id = idSchema.parse(formValue.text(formData, "id"));
  const direction = formValue.text(formData, "direction") === "up" ? "up" : "down";
  await moveRow(faqs, id, direction);
  refreshContent(cacheTags.faqs);
}

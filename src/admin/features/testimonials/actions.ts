"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import type { ImageRef } from "@/admin/content/images";
import { imageRefSchema } from "@/admin/content/settings-schema";
import { testimonialBadges } from "@/admin/content/types";
import { hydrateImageRef } from "@/admin/features/media/queries";
import type { ActionState } from "@/admin/lib/action-state";
import { formValue, parseOrThrow, runAction } from "@/admin/server/action";
import { diff, logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { cacheTags, refreshContent } from "@/admin/server/cache";
import { getDb } from "@/admin/server/db/client";
import { testimonials } from "@/admin/server/db/schema";
import { moveRow, nextSortOrder } from "@/admin/server/ordering";

const idSchema = z.string().uuid();
const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters.`);

const testimonialSchema = z.object({
  name: text(80).min(2, "Enter the customer’s name."),
  location: text(80),
  quote: text(600).min(20, "Write the review (at least 20 characters)."),
  rating: z.coerce.number().int().min(1).max(5),
  badgeKind: z.enum(testimonialBadges),
  badgeLabel: text(40),
  avatar: imageRefSchema.nullable(),
  isPublished: z.boolean(),
  isSample: z.boolean(),
});

export async function saveTestimonial(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("content:write");
    const id = formValue.text(formData, "id");
    const parsed = parseOrThrow(testimonialSchema, {
      name: formValue.text(formData, "name"),
      location: formValue.text(formData, "location"),
      quote: formValue.text(formData, "quote"),
      rating: formValue.text(formData, "rating") || "5",
      badgeKind: formValue.text(formData, "badgeKind"),
      badgeLabel: formValue.text(formData, "badgeLabel"),
      avatar: formValue.json<ImageRef | null>(formData, "avatar", null),
      isPublished: formValue.bool(formData, "isPublished"),
      isSample: formValue.bool(formData, "isSample"),
    });
    const values = { ...parsed, avatar: await hydrateImageRef(parsed.avatar) };
    const db = await getDb();
    if (id) {
      const [before] = await db
        .select()
        .from(testimonials)
        .where(eq(testimonials.id, idSchema.parse(id)));
      if (!before) return "That review no longer exists.";
      await db.update(testimonials).set(values).where(eq(testimonials.id, before.id));
      await logActivity(user, {
        action: "testimonial.update",
        entityType: "testimonial",
        entityId: before.id,
        summary: `Updated review by ${values.name}`,
        changes: diff(before as Record<string, unknown>, values),
      });
    } else {
      const [created] = await db
        .insert(testimonials)
        .values({ ...values, sortOrder: await nextSortOrder(testimonials) })
        .returning({ id: testimonials.id });
      await logActivity(user, {
        action: "testimonial.create",
        entityType: "testimonial",
        entityId: created.id,
        summary: `Added review by ${values.name}`,
      });
    }
    refreshContent(cacheTags.testimonials);
    return id ? "Review saved." : "Review added.";
  });
}

export async function deleteTestimonial(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("content:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    const [deleted] = await db
      .delete(testimonials)
      .where(eq(testimonials.id, id))
      .returning({ name: testimonials.name });
    if (deleted) {
      await logActivity(user, {
        action: "testimonial.delete",
        entityType: "testimonial",
        entityId: id,
        summary: `Deleted review by ${deleted.name}`,
      });
      refreshContent(cacheTags.testimonials);
    }
    return "Review deleted.";
  });
}

export async function moveTestimonial(formData: FormData) {
  await assertPermission("content:write");
  await moveRow(
    testimonials,
    idSchema.parse(formValue.text(formData, "id")),
    formValue.text(formData, "direction") === "up" ? "up" : "down",
  );
  refreshContent(cacheTags.testimonials);
}

/** Hides or deletes every placeholder ("sample") review in one go. */
export async function clearSampleTestimonials(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("content:write");
    const mode = formValue.text(formData, "mode") === "delete" ? "delete" : "hide";
    const db = await getDb();
    const affected =
      mode === "delete"
        ? await db.delete(testimonials).where(eq(testimonials.isSample, true)).returning({ id: testimonials.id })
        : await db
            .update(testimonials)
            .set({ isPublished: false })
            .where(and(eq(testimonials.isSample, true), eq(testimonials.isPublished, true)))
            .returning({ id: testimonials.id });
    if (affected.length) {
      await logActivity(user, {
        action: `testimonial.samples.${mode}`,
        entityType: "testimonial",
        summary: `${mode === "delete" ? "Deleted" : "Hid"} ${affected.length} sample reviews`,
      });
      refreshContent(cacheTags.testimonials);
    }
    return affected.length
      ? `${mode === "delete" ? "Deleted" : "Hid"} ${affected.length} sample reviews.`
      : "No sample reviews to change.";
  });
}

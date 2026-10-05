"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { enquiryStatuses, enquiryStatusLabels } from "@/admin/content/types";
import type { ActionState } from "@/admin/lib/action-state";
import { formValue, parseOrThrow, runAction } from "@/admin/server/action";
import { diff, logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { enquiries, notes } from "@/admin/server/db/schema";

const idSchema = z.string().uuid();

const updateSchema = z.object({
  status: z.enum(enquiryStatuses),
  assignedTo: z.string().uuid().nullable(),
  followUpAt: z.date().nullable(),
});

/** Pipeline status, owner and follow-up date of one enquiry. */
export async function updateEnquiry(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("enquiries:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const followUp = formValue.text(formData, "followUpAt");
    const values = parseOrThrow(updateSchema, {
      status: formValue.text(formData, "status"),
      assignedTo: formValue.text(formData, "assignedTo") || null,
      // datetime-local values are India time.
      followUpAt: followUp ? new Date(`${followUp}:00+05:30`) : null,
    });
    if (values.followUpAt && Number.isNaN(values.followUpAt.getTime())) values.followUpAt = null;

    const db = await getDb();
    const [before] = await db.select().from(enquiries).where(eq(enquiries.id, id));
    if (!before) return "That enquiry no longer exists.";
    await db
      .update(enquiries)
      .set({ ...values, isRead: true })
      .where(eq(enquiries.id, id));
    const changes = diff(before as Record<string, unknown>, values);
    if (Object.keys(changes).length) {
      await logActivity(user, {
        action: "enquiry.update",
        entityType: "enquiry",
        entityId: id,
        summary:
          before.status !== values.status
            ? `Moved enquiry from ${before.name || "a visitor"} to “${enquiryStatusLabels[values.status]}”`
            : `Updated enquiry from ${before.name || "a visitor"}`,
        changes,
      });
    }
    refresh();
    return "Enquiry updated.";
  });
}

/** Marks an enquiry read when it's opened (called from the detail page). */
export async function markEnquiryRead(id: string) {
  await assertPermission("enquiries:read");
  const db = await getDb();
  await db
    .update(enquiries)
    .set({ isRead: true })
    .where(and(eq(enquiries.id, idSchema.parse(id)), eq(enquiries.isRead, false)));
  // Updates the unread badges.
  refresh();
}

export async function setEnquiryRead(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await assertPermission("enquiries:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const read = formValue.bool(formData, "read");
    const db = await getDb();
    await db.update(enquiries).set({ isRead: read }).where(eq(enquiries.id, id));
    refresh();
    return read ? "Marked as read." : "Marked as unread.";
  });
}

export async function markAllEnquiriesRead(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("enquiries:write");
    const formKey = formValue.text(formData, "form");
    const db = await getDb();
    const updated = await db
      .update(enquiries)
      .set({ isRead: true })
      .where(and(eq(enquiries.isRead, false), formKey ? eq(enquiries.formKey, formKey) : undefined))
      .returning({ id: enquiries.id });
    if (updated.length)
      await logActivity(user, {
        action: "enquiry.read-all",
        entityType: "enquiry",
        summary: `Marked ${updated.length} enquiries as read`,
      });
    refresh();
    return updated.length ? `Marked ${updated.length} as read.` : "Everything was already read.";
  });
}

const bulkSchema = z.enum([
  "read",
  "unread",
  "delete",
  ...enquiryStatuses.map((status) => `status:${status}` as const),
]);

export async function bulkUpdateEnquiries(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const operation = bulkSchema.parse(formValue.text(formData, "operation"));
    const user = await assertPermission(operation === "delete" ? "enquiries:delete" : "enquiries:write");
    const ids = z.array(idSchema).min(1).max(500).parse(formData.getAll("ids").map(String));
    const db = await getDb();
    const where = inArray(enquiries.id, ids);
    if (operation === "delete") {
      await db.transaction(async (tx) => {
        await tx.delete(notes).where(and(eq(notes.entityType, "enquiry"), inArray(notes.entityId, ids)));
        await tx.delete(enquiries).where(where);
      });
    } else if (operation === "read" || operation === "unread") {
      await db
        .update(enquiries)
        .set({ isRead: operation === "read" })
        .where(where);
    } else {
      const status = operation.slice("status:".length) as (typeof enquiryStatuses)[number];
      await db.update(enquiries).set({ status, isRead: true }).where(where);
    }
    const label =
      operation === "delete"
        ? "Deleted"
        : operation === "read"
          ? "Marked as read"
          : operation === "unread"
            ? "Marked as unread"
            : `Moved to “${enquiryStatusLabels[operation.slice(7) as (typeof enquiryStatuses)[number]]}”`;
    await logActivity(user, {
      action: `enquiry.bulk.${operation}`,
      entityType: "enquiry",
      summary: `${label}: ${ids.length} enquir${ids.length === 1 ? "y" : "ies"}`,
    });
    refresh();
    return `${label}: ${ids.length} enquir${ids.length === 1 ? "y" : "ies"}.`;
  });
}

export async function deleteEnquiry(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const user = await assertPermission("enquiries:delete");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    const deleted = await db.transaction(async (tx) => {
      await tx.delete(notes).where(and(eq(notes.entityType, "enquiry"), eq(notes.entityId, id)));
      const [row] = await tx
        .delete(enquiries)
        .where(eq(enquiries.id, id))
        .returning({ name: enquiries.name, formName: enquiries.formName });
      return row;
    });
    if (deleted) {
      await logActivity(user, {
        action: "enquiry.delete",
        entityType: "enquiry",
        entityId: id,
        summary: `Deleted ${deleted.formName.toLowerCase()} from ${deleted.name || "a visitor"}`,
      });
    }
    return "Enquiry deleted.";
  });
  if (result.status === "success") redirect(`/admin/enquiries?deleted=1`);
  return result;
}

"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  messageChannelLabels,
  messageChannels,
  messageDirections,
  messageStatuses,
  messageStatusLabels,
} from "@/admin/content/types";
import type { ActionState } from "@/admin/lib/action-state";
import { FormError, formValue, parseOrThrow, runAction } from "@/admin/server/action";
import { diff, logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { leadEvents, messages, notes, products } from "@/admin/server/db/schema";

import { normalizePhone } from "./ingest";

const idSchema = z.string().uuid();

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Keep the email under 254 characters.")
  .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address.");

const logSchema = z
  .object({
    channel: z.enum(messageChannels, "Choose a channel."),
    direction: z.enum(messageDirections, "Choose who contacted whom."),
    contactName: z.string().trim().max(160, "Keep the name under 160 characters."),
    contactPhone: z
      .string()
      .trim()
      .max(30, "Keep the phone number under 30 characters.")
      .regex(/^[+\d\s()-]*$/, "Use digits, spaces, + and - only."),
    contactEmail: emailField,
    subject: z.string().trim().max(300, "Keep the subject under 300 characters."),
    body: z
      .string()
      .trim()
      .min(2, "Write a short summary of the conversation.")
      .max(10_000, "Keep it under 10,000 characters."),
    occurredAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick the date and time.")
      .transform((value) => new Date(`${value}:00+05:30`))
      .refine((date) => !Number.isNaN(date.getTime()), "Pick a valid date and time.")
      .refine(
        (date) => date.getTime() <= Date.now() + 5 * 60_000,
        "That’s in the future — log conversations once they’ve happened.",
      )
      .refine((date) => date.getFullYear() >= 2014, "Pick a date after 2014."),
    productId: z.union([z.literal(""), z.string().uuid("Choose a product from the list.")]),
  })
  .refine((values) => values.contactName || values.contactPhone || values.contactEmail, {
    message: "Add a name, phone number or email so the team knows who this was.",
    path: ["contactName"],
  });

/** Records a conversation that happened outside the website (phone call, walk-in, personal WhatsApp…). */
export async function logConversation(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("inbox:write");
    const values = parseOrThrow(logSchema, {
      channel: formValue.text(formData, "channel"),
      direction: formValue.text(formData, "direction"),
      contactName: formValue.text(formData, "contactName"),
      contactPhone: formValue.text(formData, "contactPhone"),
      contactEmail: formValue.text(formData, "contactEmail"),
      subject: formValue.text(formData, "subject"),
      body: formValue.text(formData, "body"),
      occurredAt: formValue.text(formData, "occurredAt"),
      productId: formValue.text(formData, "productId"),
    });
    const db = await getDb();

    if (values.productId) {
      const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, values.productId));
      if (!product)
        throw new FormError("Please fix the highlighted fields.", { productId: "That product no longer exists." });
    }

    const [created] = await db
      .insert(messages)
      .values({
        channel: values.channel,
        direction: values.direction,
        status: values.direction === "outbound" ? "replied" : "open",
        isRead: true,
        contactName: values.contactName,
        contactPhone: normalizePhone(values.contactPhone),
        contactEmail: values.contactEmail,
        subject: values.subject,
        body: values.body,
        source: "manual",
        meta: { loggedBy: user.name },
        productId: values.productId || null,
        occurredAt: values.occurredAt,
      })
      .returning({ id: messages.id });

    const who = values.contactName || values.contactPhone || values.contactEmail;
    await logActivity(user, {
      action: "message.create",
      entityType: "message",
      entityId: created.id,
      summary: `Logged a ${messageChannelLabels[values.channel].toLowerCase()} conversation with ${who}`,
    });
    refresh();
    return { message: "Conversation logged.", data: { id: created.id } };
  });
}

/** Status from the message page (new → open → replied → closed, or spam). */
export async function updateMessageStatus(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("inbox:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const { status } = parseOrThrow(z.object({ status: z.enum(messageStatuses, "Choose a status.") }), {
      status: formValue.text(formData, "status"),
    });
    const db = await getDb();
    const [before] = await db.select({ status: messages.status }).from(messages).where(eq(messages.id, id));
    if (!before) return "That message no longer exists.";
    if (before.status === status) return `Already ${messageStatusLabels[status].toLowerCase()}.`;
    await db.update(messages).set({ status, isRead: true }).where(eq(messages.id, id));
    await logActivity(user, {
      action: "message.status",
      entityType: "message",
      entityId: id,
      summary: `Marked a message as ${messageStatusLabels[status].toLowerCase()}`,
      changes: diff(before, { status }),
    });
    refresh();
    return `Status set to ${messageStatusLabels[status].toLowerCase()}.`;
  });
}

/** Assigns the message to the signed-in user, or clears the assignment. */
export async function assignMessage(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("inbox:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const assignee = formValue.text(formData, "assignee") === "me" ? user.id : null;
    const db = await getDb();
    const [before] = await db.select({ assignedTo: messages.assignedTo }).from(messages).where(eq(messages.id, id));
    if (!before) return "That message no longer exists.";
    await db.update(messages).set({ assignedTo: assignee }).where(eq(messages.id, id));
    await logActivity(user, {
      action: "message.assign",
      entityType: "message",
      entityId: id,
      summary: assignee ? `Took ownership of a message` : `Unassigned a message`,
      changes: diff(before, { assignedTo: assignee }),
    });
    refresh();
    return assignee ? "Assigned to you." : "Unassigned.";
  });
}

/** Marks a message unread and returns to the inbox (staying would mark it read again). */
export async function markMessageUnread(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("inbox:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    await db.update(messages).set({ isRead: false }).where(eq(messages.id, id));
    await logActivity(user, {
      action: "message.unread",
      entityType: "message",
      entityId: id,
      summary: "Marked a message as unread",
    });
    redirect("/admin/inbox");
  });
}

/** Deletes a message and its internal notes (admins and owners). */
export async function deleteMessage(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("enquiries:delete");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    const deleted = await db.transaction(async (tx) => {
      await tx.delete(notes).where(and(eq(notes.entityType, "message"), eq(notes.entityId, id)));
      return tx.delete(messages).where(eq(messages.id, id)).returning({
        channel: messages.channel,
        contactName: messages.contactName,
        contactPhone: messages.contactPhone,
        contactEmail: messages.contactEmail,
      });
    });
    const [row] = deleted;
    if (row) {
      await logActivity(user, {
        action: "message.delete",
        entityType: "message",
        entityId: id,
        summary: `Deleted a ${messageChannelLabels[row.channel].toLowerCase()} message from ${row.contactName || row.contactPhone || row.contactEmail || "an unknown contact"}`,
      });
    }
    redirect("/admin/inbox");
  });
}

const bulkOps = ["read", "unread", "close", "spam", "reopen", "delete"] as const;
type BulkOp = (typeof bulkOps)[number];

const bulkSchema = z.object({
  op: z.enum(bulkOps, "Choose an action."),
  ids: z.array(idSchema).min(1, "Select at least one message.").max(200, "Select at most 200 messages at a time."),
});

const bulkDone: Record<BulkOp, string> = {
  read: "marked as read",
  unread: "marked as unread",
  close: "closed",
  spam: "moved to spam",
  reopen: "reopened",
  delete: "deleted",
};

/** Bulk actions from the inbox list (ids comma-separated in one field). */
export async function bulkUpdateMessages(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const { op, ids } = parseOrThrow(bulkSchema, {
      op: formValue.text(formData, "op"),
      ids: [...new Set(formValue.list(formData, "ids"))],
    });
    const user = await assertPermission(op === "delete" ? "enquiries:delete" : "inbox:write");
    const db = await getDb();
    const where = inArray(messages.id, ids);

    let affected: { id: string }[];
    if (op === "delete") {
      affected = await db.transaction(async (tx) => {
        await tx.delete(notes).where(and(eq(notes.entityType, "message"), inArray(notes.entityId, ids)));
        return tx.delete(messages).where(where).returning({ id: messages.id });
      });
    } else {
      const changes = {
        read: { isRead: true },
        unread: { isRead: false },
        close: { status: "closed" as const, isRead: true },
        spam: { status: "spam" as const, isRead: true },
        reopen: { status: "open" as const },
      }[op];
      affected = await db.update(messages).set(changes).where(where).returning({ id: messages.id });
    }

    const n = affected.length;
    const noun = n === 1 ? "message" : "messages";
    await logActivity(user, {
      action: `message.bulk_${op}`,
      entityType: "message",
      entityId: n === 1 ? affected[0].id : "",
      summary: `${n} ${noun} ${bulkDone[op]}`,
      changes: n > 1 ? { ids: { from: null, to: affected.map((row) => row.id) } } : undefined,
    });
    refresh();
    return n === 0 ? "Those messages no longer exist." : `${n} ${noun} ${bulkDone[op]}.`;
  });
}

/** Removes one contact-click record (e.g. the team's own test clicks). Admins and owners. */
export async function deleteLeadEvent(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("enquiries:delete");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    const [deleted] = await db
      .delete(leadEvents)
      .where(eq(leadEvents.id, id))
      .returning({ type: leadEvents.type, context: leadEvents.context });
    if (deleted) {
      await logActivity(user, {
        action: "lead_event.delete",
        entityType: "lead_event",
        entityId: id,
        summary: `Deleted a ${deleted.type} click record${deleted.context ? ` (${deleted.context})` : ""}`,
      });
    }
    refresh();
    return "Click record deleted.";
  });
}

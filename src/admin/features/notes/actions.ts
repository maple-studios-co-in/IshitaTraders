"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import type { Permission } from "@/admin/config/permissions";
import type { ActionState } from "@/admin/lib/action-state";
import { formValue, parseOrThrow, runAction } from "@/admin/server/action";
import { logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { getDb } from "@/admin/server/db/client";
import { notes } from "@/admin/server/db/schema";

const entityTypes = ["enquiry", "message"] as const;

const noteSchema = z.object({
  entityType: z.enum(entityTypes),
  entityId: z.string().uuid(),
  body: z.string().trim().min(1, "Write a note first.").max(4000, "Keep notes under 4000 characters."),
});

const permissionFor = (entityType: (typeof entityTypes)[number]): Permission =>
  entityType === "enquiry" ? "enquiries:write" : "inbox:write";

/** Adds an internal note (follow-up details, quotes sent…) to an enquiry or message. */
export async function addNote(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const values = parseOrThrow(noteSchema, {
      entityType: formValue.text(formData, "entityType"),
      entityId: formValue.text(formData, "entityId"),
      body: formValue.text(formData, "body"),
    });
    const user = await assertPermission(permissionFor(values.entityType));
    const db = await getDb();
    await db.insert(notes).values({ ...values, authorId: user.id, authorName: user.name });
    await logActivity(user, {
      action: "note.create",
      entityType: values.entityType,
      entityId: values.entityId,
      summary: `Added a note to ${values.entityType === "enquiry" ? "an enquiry" : "a message"}`,
    });
    refresh();
    return "Note added.";
  });
}

export async function deleteNote(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = z.string().uuid().parse(formValue.text(formData, "id"));
    const entityType = z.enum(entityTypes).parse(formValue.text(formData, "entityType"));
    await assertPermission(permissionFor(entityType));
    const db = await getDb();
    await db.delete(notes).where(and(eq(notes.id, id), eq(notes.entityType, entityType)));
    refresh();
    return "Note deleted.";
  });
}

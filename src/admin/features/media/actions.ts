"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/admin/lib/action-state";
import { FormError, formValue, runAction } from "@/admin/server/action";
import { logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { cacheTags, refreshContent } from "@/admin/server/cache";
import { getDb } from "@/admin/server/db/client";
import { media } from "@/admin/server/db/schema";
import { deleteStoredMedia } from "@/admin/server/storage";

import { collectMediaUsage } from "./queries";

const idSchema = z.string().uuid();

export async function saveMediaAlt(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("media:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const alt = formValue.text(formData, "alt").slice(0, 200);
    const db = await getDb();
    const [row] = await db.update(media).set({ alt }).where(eq(media.id, id)).returning({ fileName: media.fileName });
    if (!row) return "That file no longer exists.";
    await logActivity(user, {
      action: "media.update",
      entityType: "media",
      entityId: id,
      summary: `Updated the description of ${row.fileName}`,
    });
    refresh();
    return "Description saved.";
  });
}

export async function deleteMedia(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("media:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const force = formValue.bool(formData, "force");
    const usage = (await collectMediaUsage()).get(id) ?? [];
    if (usage.length > 0 && !force) {
      throw new FormError(`Still used by ${usage.map((item) => item.label).join(", ")}. Replace it there first.`);
    }
    const db = await getDb();
    const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!row) return "File deleted.";
    await deleteStoredMedia(row);
    await logActivity(user, {
      action: "media.delete",
      entityType: "media",
      entityId: id,
      summary: `Deleted ${row.fileName}`,
    });
    if (usage.length > 0) refreshContent(cacheTags.catalog, cacheTags.settings, cacheTags.testimonials);
    else refresh();
    return "File deleted.";
  });
}

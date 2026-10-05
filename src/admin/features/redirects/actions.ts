"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import type { ActionState } from "@/admin/lib/action-state";
import { formatBytes, pluralize } from "@/admin/lib/format";
import { normalizePath } from "@/admin/lib/paths";
import { FormError, formValue, parseOrThrow, runAction } from "@/admin/server/action";
import { diff, logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { cacheTags, refreshContent } from "@/admin/server/cache";
import { getDb } from "@/admin/server/db/client";
import { redirects } from "@/admin/server/db/schema";

import { DESTINATION_MAX, SOURCE_MAX, isRedirectCode, parseRedirectCsv } from "./rules";
import { loadRedirectContext, validateRedirect } from "./validation";

const idSchema = z.string().uuid();

const redirectSchema = z.object({
  source: z.string().max(SOURCE_MAX + 100, "That address is too long."),
  destination: z.string().max(DESTINATION_MAX, `Keep the destination under ${DESTINATION_MAX} characters.`),
  statusCode: z.coerce.number().refine(isRedirectCode, "Choose a redirect type."),
  isActive: z.boolean(),
});

const MAX_IMPORT_ROWS = 500;
const MAX_IMPORT_BYTES = 200 * 1024;

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && "name" in value;
}

export async function saveRedirect(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("redirects:write");
    const rawId = formValue.text(formData, "id");
    const id = rawId ? idSchema.parse(rawId) : undefined;
    const input = parseOrThrow(redirectSchema, {
      source: formValue.text(formData, "source"),
      destination: formValue.text(formData, "destination"),
      statusCode: formValue.text(formData, "statusCode") || "301",
      isActive: formValue.bool(formData, "isActive"),
    });

    const context = await loadRedirectContext();
    const before = id ? context.redirects.find((item) => item.id === id) : undefined;
    if (id && !before) throw new FormError("That redirect no longer exists — it may have been deleted.");
    const checked = validateRedirect(input, context, id);
    if (!checked.ok) throw new FormError("Please fix the highlighted fields.", checked.errors);

    const values = {
      source: checked.source,
      destination: checked.destination,
      statusCode: input.statusCode,
      isActive: input.isActive,
    };
    const db = await getDb();
    if (id && before) {
      const [previous] = await db.select().from(redirects).where(eq(redirects.id, id)).limit(1);
      await db.update(redirects).set(values).where(eq(redirects.id, id));
      await logActivity(user, {
        action: "redirect.update",
        entityType: "redirect",
        entityId: id,
        summary: `Updated redirect ${values.source} → ${values.destination}`,
        changes: diff(previous ?? null, values),
      });
    } else {
      const [created] = await db.insert(redirects).values(values).returning({ id: redirects.id });
      await logActivity(user, {
        action: "redirect.create",
        entityType: "redirect",
        entityId: created.id,
        summary: `Added redirect ${values.source} → ${values.destination} (${values.statusCode})`,
      });
    }

    refreshContent(cacheTags.redirects);
    return id ? "Redirect updated." : `Redirect added: ${values.source} now goes to ${values.destination}.`;
  });
}

export async function toggleRedirect(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("redirects:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const context = await loadRedirectContext();
    const row = context.redirects.find((item) => item.id === id);
    if (!row) throw new FormError("That redirect no longer exists — it may have been deleted.");
    const isActive = !row.isActive;
    if (isActive) {
      // Things may have changed while it was paused (a page now uses the address, a loop…).
      const checked = validateRedirect(
        { source: row.source, destination: row.destination, isActive: true },
        context,
        id,
      );
      if (!checked.ok)
        throw new FormError(`Can’t turn this redirect on: ${checked.errors.source ?? checked.errors.destination}`);
    }
    const db = await getDb();
    await db.update(redirects).set({ isActive }).where(eq(redirects.id, id));
    await logActivity(user, {
      action: isActive ? "redirect.enable" : "redirect.disable",
      entityType: "redirect",
      entityId: id,
      summary: `${isActive ? "Turned on" : "Paused"} redirect ${row.source} → ${row.destination}`,
      changes: { isActive: { from: row.isActive, to: isActive } },
    });
    refreshContent(cacheTags.redirects);
    return isActive ? `Redirect from ${row.source} turned on.` : `Redirect from ${row.source} paused.`;
  });
}

export async function deleteRedirect(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("redirects:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    const [deleted] = await db
      .delete(redirects)
      .where(eq(redirects.id, id))
      .returning({ source: redirects.source, destination: redirects.destination });
    if (deleted) {
      await logActivity(user, {
        action: "redirect.delete",
        entityType: "redirect",
        entityId: id,
        summary: `Deleted redirect ${deleted.source} → ${deleted.destination}`,
      });
      refreshContent(cacheTags.redirects);
    }
    return "Redirect deleted.";
  });
}

/**
 * Bulk import from CSV (`source,destination[,code]`). All or nothing: any invalid line means
 * nothing is imported and every problem is listed. Rows identical to an existing redirect are skipped.
 */
export async function importRedirects(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("redirects:write");
    let text = String(formData.get("csv") ?? "");
    const file = formData.get("file");
    if (isUploadedFile(file) && file.size > 0) {
      if (file.size > MAX_IMPORT_BYTES)
        throw new FormError("Please fix the highlighted fields.", {
          file: `That file is ${formatBytes(file.size)} — the limit is 200 KB.`,
        });
      text = await file.text();
    }
    if (!text.trim())
      throw new FormError("Please fix the highlighted fields.", {
        csv: "Paste the redirects, one per line, or choose a CSV file.",
      });
    if (text.length > MAX_IMPORT_BYTES)
      throw new FormError("Please fix the highlighted fields.", {
        csv: "That’s too much at once — import up to 500 lines at a time.",
      });

    const rows = parseRedirectCsv(text);
    if (rows.length === 0)
      throw new FormError("Please fix the highlighted fields.", {
        csv: "No redirects found. Use one line per redirect: /old-page,/new-page,301",
      });
    if (rows.length > MAX_IMPORT_ROWS)
      throw new FormError("Please fix the highlighted fields.", {
        csv: `That’s ${rows.length} lines — import up to ${MAX_IMPORT_ROWS} at a time.`,
      });

    const context = await loadRedirectContext();
    const problems: string[] = [];
    const accepted: { source: string; destination: string; statusCode: number; isActive: boolean }[] = [];
    let skipped = 0;

    for (const row of rows) {
      const statusCode = row.code ? Number(row.code) : 301;
      if (!isRedirectCode(statusCode)) {
        problems.push(`Line ${row.line}: “${row.code}” isn’t a redirect type — use 301, 302, 307 or 308.`);
        continue;
      }
      const existing = context.redirects.find((item) => normalizePath(item.source) === normalizePath(row.source));
      if (existing && existing.destination === row.destination.trim()) {
        skipped++;
        continue;
      }
      const checked = validateRedirect({ source: row.source, destination: row.destination, isActive: true }, context);
      if (!checked.ok) {
        problems.push(`Line ${row.line}: ${checked.errors.source ?? checked.errors.destination}`);
        continue;
      }
      accepted.push({ source: checked.source, destination: checked.destination, statusCode, isActive: true });
      // Later lines are checked against earlier ones too (duplicates, loops within the file).
      context.redirects.push({
        id: `import:${row.line}`,
        source: checked.source,
        destination: checked.destination,
        isActive: true,
      });
    }

    if (problems.length) {
      throw new FormError(`Nothing was imported — ${pluralize(problems.length, "line needs", "lines need")} fixing.`, {
        csv: [...problems.slice(0, 12), ...(problems.length > 12 ? [`…and ${problems.length - 12} more.`] : [])].join(
          "\n",
        ),
      });
    }
    if (accepted.length === 0)
      return `Nothing new to import — ${pluralize(skipped, "redirect")} already ${skipped === 1 ? "exists" : "exist"}.`;

    const db = await getDb();
    await db.insert(redirects).values(accepted);
    await logActivity(user, {
      action: "redirect.import",
      entityType: "redirect",
      summary: `Imported ${pluralize(accepted.length, "redirect")} from CSV${skipped ? ` (${skipped} already existed)` : ""}`,
    });
    refreshContent(cacheTags.redirects);
    return `Imported ${pluralize(accepted.length, "redirect")}${skipped ? ` · skipped ${skipped} that already existed` : ""}.`;
  });
}

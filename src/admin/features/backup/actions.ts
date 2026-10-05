"use server";

import { refresh } from "next/cache";

import type { ActionState } from "@/admin/lib/action-state";
import { formatDateTime } from "@/admin/lib/format";
import { FormError, formValue, runAction } from "@/admin/server/action";
import { logActivity } from "@/admin/server/audit";
import { AuthError, assertPermission } from "@/admin/server/auth/guard";
import { cacheTags, refreshContent } from "@/admin/server/cache";

import { RESTORE_CONFIRM_WORD } from "./format";
import { applyRestore, planRestore, readBackupUpload } from "./restore";

/** Restoring is owner-only (a stricter bar than downloading, which admins may do). */
async function assertOwner() {
  const actor = await assertPermission("backup:export");
  if (actor.role !== "owner") throw new AuthError("Only an owner can restore a backup.");
  return actor;
}

/** Validates an uploaded backup and reports what restoring it would change. Writes nothing. */
export async function previewRestore(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await assertOwner();
    const backup = await readBackupUpload(formData);
    const plan = await planRestore(backup);
    return { message: "Backup checked — review the changes below.", data: { plan } };
  });
}

/** Writes the backup's website content back (one transaction), then refreshes the public site. */
export async function restoreBackup(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const actor = await assertOwner();
    if (formValue.text(formData, "confirm") !== RESTORE_CONFIRM_WORD) {
      throw new FormError(`Type ${RESTORE_CONFIRM_WORD} to confirm.`, {
        confirm: `Type ${RESTORE_CONFIRM_WORD} to confirm.`,
      });
    }
    const backup = await readBackupUpload(formData);
    const plan = await applyRestore(backup, actor.id);

    refreshContent(...Object.values(cacheTags));
    await logActivity(actor, {
      action: "backup.restore",
      entityType: "backup",
      summary: `Restored website content from the backup of ${formatDateTime(backup.exportedAt)} (${plan.totalRows.toLocaleString("en-IN")} rows)`,
      changes: Object.fromEntries(
        plan.tables
          .filter((table) => table.rows > 0 || table.replace > 0)
          .map((table) => [
            table.table,
            {
              from: null,
              to: `${table.update} updated, ${table.create} added, ${table.replace} replaced, ${table.keep} kept`,
            },
          ]),
      ),
    });
    refresh();
    return { message: "Backup restored. The website now shows the restored content.", data: { plan } };
  });
}

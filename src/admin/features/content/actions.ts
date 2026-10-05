"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import type { ImageRef } from "@/admin/content/images";
import {
  defaultSettings,
  mergeSection,
  settingsKeys,
  settingsSchemas,
  type SettingsKey,
} from "@/admin/content/settings-schema";
import { hydrateImageRef } from "@/admin/features/media/queries";
import type { Permission } from "@/admin/config/permissions";
import type { ActionState } from "@/admin/lib/action-state";
import { formValue, parseOrThrow, runAction } from "@/admin/server/action";
import { logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { cacheTags, refreshContent } from "@/admin/server/cache";
import { getDb } from "@/admin/server/db/client";
import { settings } from "@/admin/server/db/schema";

import { sectionLabel } from "./sections";

const sectionSchema = z.enum(settingsKeys as [SettingsKey, ...SettingsKey[]]);

const permissionFor = (section: SettingsKey): Permission =>
  section === "seo" ? "seo:write" : section === "notifications" ? "integrations:manage" : "content:write";

function setPath(target: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let node = target;
  for (const key of keys.slice(0, -1)) {
    if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = value;
}

/**
 * Turns a settings form into an object: dotted names nest (`director.name`), names listed in
 * `__json` are parsed as JSON (lists, images), names in `__bool` are checkboxes (absent = false).
 */
function readSettingsForm(formData: FormData) {
  const list = (key: string) => new Set(formValue.text(formData, key).split(",").filter(Boolean));
  const json = list("__json");
  const bools = list("__bool");
  const result: Record<string, unknown> = {};
  for (const key of bools) setPath(result, key, false);
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("__") || key.startsWith("$") || typeof value !== "string") continue;
    if (bools.has(key)) setPath(result, key, value === "on" || value === "true");
    else if (json.has(key)) {
      try {
        setPath(result, key, value ? JSON.parse(value) : null);
      } catch {
        setPath(result, key, null);
      }
    } else setPath(result, key, value.trim());
  }
  return result;
}

function flatten(value: unknown, prefix = "", out: Record<string, unknown> = {}) {
  if (value && typeof value === "object" && !Array.isArray(value) && !("kind" in value)) {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
  } else out[prefix] = value;
  return out;
}

function changesBetween(before: unknown, after: unknown) {
  const a = flatten(before);
  const b = flatten(after);
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (JSON.stringify(a[key] ?? null) !== JSON.stringify(b[key] ?? null))
      changes[key] = { from: a[key] ?? null, to: b[key] ?? null };
  }
  return changes;
}

/** Rebuilds image references in a section from the media table (never trusting posted URLs). */
async function hydrateImages<T extends Record<string, unknown>>(values: T): Promise<T> {
  const copy: Record<string, unknown> = { ...values };
  for (const [key, value] of Object.entries(copy)) {
    if (value && typeof value === "object" && "kind" in value) copy[key] = await hydrateImageRef(value as ImageRef);
  }
  return copy as T;
}

export async function saveSettings(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const section = sectionSchema.parse(formValue.text(formData, "__section"));
    const user = await assertPermission(permissionFor(section));
    const parsed = parseOrThrow(settingsSchemas[section], readSettingsForm(formData));
    const values = await hydrateImages(parsed as Record<string, unknown>);

    const db = await getDb();
    const [before] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, section));
    const previous = mergeSection(section, before?.value);
    await db
      .insert(settings)
      .values({ key: section, value: values, updatedBy: user.id })
      .onConflictDoUpdate({ target: settings.key, set: { value: values, updatedBy: user.id, updatedAt: new Date() } });

    const changes = changesBetween(previous, values);
    if (Object.keys(changes).length) {
      await logActivity(user, {
        action: `settings.${section}`,
        entityType: "settings",
        entityId: section,
        summary: `Updated ${sectionLabel(section)}`,
        changes,
      });
    }
    refreshContent(cacheTags.settings);
    return `${sectionLabel(section)} saved — live on the website now.`;
  });
}

/** Removes the stored section so the original design's values apply again. */
export async function resetSettings(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const section = sectionSchema.parse(formValue.text(formData, "section"));
    const user = await assertPermission(permissionFor(section));
    const db = await getDb();
    const [removed] = await db.delete(settings).where(eq(settings.key, section)).returning({ value: settings.value });
    if (removed) {
      await logActivity(user, {
        action: `settings.${section}.reset`,
        entityType: "settings",
        entityId: section,
        summary: `Reset ${sectionLabel(section)} to the original design`,
        changes: changesBetween(mergeSection(section, removed.value), defaultSettings[section]),
      });
      refreshContent(cacheTags.settings);
    }
    return `${sectionLabel(section)} reset to the original values.`;
  });
}

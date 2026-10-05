import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { cacheTags } from "@/admin/server/cache";
import { getDb } from "@/admin/server/db/client";
import { settings as settingsTable } from "@/admin/server/db/schema";

import { defaultSettings, mergeSection, settingsKeys, type SiteSettings } from "./settings-schema";
import { reportContentFallback } from "./fallback";

const loadSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const db = await getDb();
    const rows = await db.select({ key: settingsTable.key, value: settingsTable.value }).from(settingsTable);
    const stored = new Map(rows.map((row) => [row.key, row.value]));
    return Object.fromEntries(settingsKeys.map((key) => [key, mergeSection(key, stored.get(key))])) as SiteSettings;
  },
  ["site-settings:v1"],
  { tags: [cacheTags.settings], revalidate: 3600 },
);

/** Editable site settings (cached; refreshed whenever the admin saves). Falls back to defaults. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return await loadSettings();
  } catch (error) {
    reportContentFallback("settings", error);
    return defaultSettings;
  }
});

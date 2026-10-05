import "server-only";

import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";

import { isStaticImageKey, type FileRef, type ImageRef } from "@/admin/content/images";
import { getDb } from "@/admin/server/db/client";
import { brands, categories, media, products, settings, testimonials } from "@/admin/server/db/schema";
import { likePattern } from "@/admin/server/query";
import type { MediaRow } from "@/admin/server/storage";

import type { MediaItem } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_GLOBAL = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function toMediaItem(row: MediaRow): MediaItem {
  return {
    id: row.id,
    kind: row.kind,
    fileName: row.fileName,
    contentType: row.contentType,
    size: row.size,
    width: row.width,
    height: row.height,
    blurDataUrl: row.blurDataUrl,
    alt: row.alt,
    url: row.url,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listMedia({
  q = "",
  kind,
  page = 1,
  pageSize = 24,
}: {
  q?: string;
  kind?: "image" | "document";
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  const filters: SQL[] = [];
  if (kind) filters.push(eq(media.kind, kind));
  if (q) filters.push(or(ilike(media.fileName, likePattern(q)), ilike(media.alt, likePattern(q)))!);
  const where = filters.length ? and(...filters) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(media)
      .where(where)
      .orderBy(desc(media.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(media).where(where),
  ]);
  return { items: rows.map(toMediaItem), total };
}

export interface MediaUsage {
  label: string;
  href: string;
}

const settingLabels: Record<string, { label: string; href: string }> = {
  hero: { label: "Homepage hero", href: "/admin/content?section=hero" },
  catalogue: { label: "Products page", href: "/admin/content?section=catalogue" },
  seo: { label: "SEO sharing image", href: "/admin/seo" },
};

/** Where each uploaded file is used (products, brands, categories, testimonials, site content). */
export async function collectMediaUsage(): Promise<Map<string, MediaUsage[]>> {
  const db = await getDb();
  const [productRows, brandRows, categoryRows, testimonialRows, settingRows] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        image: products.image,
        gallery: products.gallery,
        datasheet: products.datasheet,
      })
      .from(products),
    db.select({ id: brands.id, name: brands.name, logo: brands.logo }).from(brands),
    db.select({ id: categories.id, name: categories.name, image: categories.image }).from(categories),
    db.select({ id: testimonials.id, name: testimonials.name, avatar: testimonials.avatar }).from(testimonials),
    db.select({ key: settings.key, value: settings.value }).from(settings),
  ]);

  const usage = new Map<string, MediaUsage[]>();
  const add = (value: unknown, entry: MediaUsage) => {
    const ids = new Set((JSON.stringify(value ?? null).match(UUID_GLOBAL) ?? []).map((id) => id.toLowerCase()));
    for (const id of ids) {
      const list = usage.get(id) ?? [];
      if (!list.some((item) => item.label === entry.label)) list.push(entry);
      usage.set(id, list);
    }
  };

  for (const row of productRows)
    add([row.image, row.gallery, row.datasheet], { label: `Product · ${row.name}`, href: `/admin/products/${row.id}` });
  for (const row of brandRows)
    add(row.logo, { label: `Brand · ${row.name}`, href: `/admin/catalogue#brand-${row.id}` });
  for (const row of categoryRows)
    add(row.image, { label: `Category · ${row.name}`, href: `/admin/catalogue#category-${row.id}` });
  for (const row of testimonialRows)
    add(row.avatar, { label: `Testimonial · ${row.name}`, href: "/admin/testimonials" });
  for (const row of settingRows) {
    if (row.key.startsWith("__")) continue;
    add(row.value, settingLabels[row.key] ?? { label: `Site content · ${row.key}`, href: "/admin/content" });
  }
  return usage;
}

/**
 * Rebuilds image references from the media table, trusting only the id and alt text sent by the
 * browser — so a tampered form can never point the site at an arbitrary URL. Unknown ids are dropped.
 */
export async function hydrateImageRefs(refs: ImageRef[]): Promise<ImageRef[]> {
  const ids = refs.flatMap((ref) => (ref.kind === "media" && UUID.test(ref.id) ? [ref.id] : []));
  const db = await getDb();
  const rows = ids.length ? await db.select().from(media).where(inArray(media.id, ids)) : [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  return refs.flatMap((ref): ImageRef[] => {
    const alt = ref.alt.trim().slice(0, 200);
    if (ref.kind === "static") return isStaticImageKey(ref.key) ? [{ kind: "static", key: ref.key, alt }] : [];
    const row = byId.get(ref.id);
    if (!row || row.kind !== "image") return [];
    return [
      {
        kind: "media",
        id: row.id,
        url: row.url,
        width: row.width,
        height: row.height,
        blurDataUrl: row.blurDataUrl,
        alt,
      },
    ];
  });
}

export async function hydrateImageRef(ref: ImageRef | null | undefined): Promise<ImageRef | null> {
  if (!ref) return null;
  return (await hydrateImageRefs([ref]))[0] ?? null;
}

export async function hydrateFileRef(ref: FileRef | null | undefined): Promise<FileRef | null> {
  if (!ref || !UUID.test(ref.mediaId)) return null;
  const db = await getDb();
  const [row] = await db.select().from(media).where(eq(media.id, ref.mediaId)).limit(1);
  if (!row || row.kind !== "document") return null;
  return { mediaId: row.id, url: row.url, name: row.fileName, size: row.size };
}

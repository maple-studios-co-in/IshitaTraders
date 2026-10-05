import "server-only";

import { gunzipSync } from "node:zlib";

import { eq, getTableColumns, inArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { z } from "zod";

import { pageStatuses, stockStatuses, testimonialBadges } from "@/admin/content/types";
import { SLUG_PATTERN } from "@/admin/lib/slug";
import { FormError } from "@/admin/server/action";
import { AuthError } from "@/admin/server/auth/guard";
import { getDb, type Database } from "@/admin/server/db/client";
import {
  brands,
  categories,
  enquiries,
  faqs,
  media,
  messages,
  pages,
  pageVersions,
  products,
  redirects,
  settings,
  testimonials,
  users,
} from "@/admin/server/db/schema";

import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupTableInfo,
  contentTables,
  MAX_RESTORE_UPLOAD_BYTES,
  type ContentTable,
  type RestorePlan,
  type RestoreTablePlan,
} from "./format";

/*
 * Restoring a backup writes back WEBSITE CONTENT only (settings, catalogue, testimonials, FAQs,
 * HTML pages + versions, redirects), upserted by id in one transaction. Leads, users and media
 * files are never touched. Rows added since the backup are kept. A current row that holds the
 * slug/address of a backup row under a different id (e.g. a freshly seeded database) is replaced
 * by the backup row, and anything that pointed at it (products → brand, enquiries → product…) is
 * moved to the restored row.
 */

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Decompressed JSON limit (the upload itself is capped by the 4 MB Server Action limit). */
const MAX_JSON_BYTES = 64 * 1024 * 1024;
const MAX_HTML = 10 * 1024 * 1024;

/* ---------------------------------------------------------------- schema */

const id = z.guid("Expected an id");
const date = z.iso.datetime({ offset: true, error: "Expected a date" }).transform((value) => new Date(value));
const userRef = id.nullable();
const text = (max = 1000) => z.string().max(max);
const int = z.int32();
const slug = text(200).regex(SLUG_PATTERN, "Expected a lowercase-and-hyphens slug");
const pageSlug = text(200).regex(/^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/i, "Expected a page address");

/** Uploaded files are served from this site (/media/…) or Vercel Blob; anything else would break images or be a script URL. */
const fileUrl = text(2000).refine(
  (value) =>
    /^\/media\/\S+$/.test(value) || /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/\S+$/i.test(value),
  "Unexpected file address",
);

const imageRef = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("static"), key: text(200).min(1), alt: text(500) }),
  z.object({
    kind: z.literal("media"),
    id: text(100).min(1),
    url: fileUrl,
    width: int.nullable(),
    height: int.nullable(),
    blurDataUrl: text(50_000)
      .refine((value) => value.startsWith("data:image/"), "Unexpected placeholder")
      .nullable(),
    alt: text(500),
  }),
]);

const fileRef = z.object({ mediaId: text(100).min(1), url: fileUrl, name: text(300), size: z.number().int().min(0) });

const redirectPath = text(2000)
  .min(1)
  .refine((value) => value.startsWith("/") && !value.startsWith("//"), "Expected a path starting with /");
const redirectTarget = text(2000)
  .min(1)
  .refine(
    (value) => (value.startsWith("/") && !value.startsWith("//")) || /^https?:\/\/\S+$/i.test(value),
    "Expected a path or an http(s) address",
  );

const rowSchemas = {
  settings: z.object({ key: text(200).min(1), value: z.json(), updatedAt: date, updatedBy: userRef }),
  brands: z.object({
    id,
    slug,
    name: text(200).min(1),
    tabLabel: text(200),
    logo: imageRef.nullable(),
    sortOrder: int,
    isActive: z.boolean(),
    createdAt: date,
    updatedAt: date,
  }),
  categories: z.object({
    id,
    slug,
    name: text(200).min(1),
    label: text(200),
    description: text(5000),
    image: imageRef.nullable(),
    enquirySubject: text(500),
    showOnHomepage: z.boolean(),
    sortOrder: int,
    createdAt: date,
    updatedAt: date,
  }),
  products: z.object({
    id,
    slug,
    sku: text(200),
    name: text(300).min(1),
    brandId: id.nullable(),
    categoryId: id.nullable(),
    typeLabel: text(200),
    subtitle: text(500),
    badge: text(200),
    summary: text(2000),
    description: text(100_000),
    image: imageRef.nullable(),
    gallery: z.array(imageRef).max(100),
    specs: z.array(z.object({ label: text(300), value: text(2000), highlight: z.boolean() })).max(300),
    applications: z.array(text(300)).max(300),
    mrp: int.nullable(),
    price: int.nullable(),
    priceNote: text(500),
    showPrice: z.boolean(),
    stockStatus: z.enum(stockStatuses),
    warranty: text(500),
    datasheet: fileRef.nullable(),
    isPublished: z.boolean(),
    isFeatured: z.boolean(),
    sortOrder: int,
    seoTitle: text(500),
    seoDescription: text(2000),
    createdAt: date,
    updatedAt: date,
    createdBy: userRef,
    updatedBy: userRef,
  }),
  testimonials: z.object({
    id,
    name: text(200).min(1),
    location: text(200),
    quote: text(5000),
    rating: z.number().int().min(0).max(5),
    badgeKind: z.enum(testimonialBadges),
    badgeLabel: text(200),
    avatar: imageRef.nullable(),
    isPublished: z.boolean(),
    isSample: z.boolean(),
    sortOrder: int,
    createdAt: date,
    updatedAt: date,
  }),
  faqs: z.object({
    id,
    question: text(1000).min(1),
    answer: text(20_000),
    isPublished: z.boolean(),
    sortOrder: int,
    createdAt: date,
    updatedAt: date,
  }),
  pages: z.object({
    id,
    slug: pageSlug,
    title: text(500).min(1),
    description: text(5000),
    html: text(MAX_HTML),
    status: z.enum(pageStatuses),
    noindex: z.boolean(),
    viewCount: int.min(0),
    publishedAt: date.nullable(),
    createdAt: date,
    updatedAt: date,
    createdBy: userRef,
    updatedBy: userRef,
  }),
  page_versions: z.object({
    id,
    pageId: id,
    title: text(500),
    html: text(MAX_HTML),
    note: text(2000),
    createdAt: date,
    createdBy: userRef,
  }),
  redirects: z.object({
    id,
    source: redirectPath,
    destination: redirectTarget,
    statusCode: int.refine((code) => [301, 302, 303, 307, 308].includes(code), "Expected 301, 302, 303, 307 or 308"),
    isActive: z.boolean(),
    hitCount: int.min(0),
    lastHitAt: date.nullable(),
    createdAt: date,
    updatedAt: date,
  }),
} satisfies Record<ContentTable, z.ZodType>;

const MAX_ROWS = 50_000;

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.iso.datetime({ offset: true }),
  // Only the content tables are read; leads, users, media and the activity log are ignored.
  tables: z.object({
    settings: z.array(rowSchemas.settings).max(MAX_ROWS),
    brands: z.array(rowSchemas.brands).max(MAX_ROWS),
    categories: z.array(rowSchemas.categories).max(MAX_ROWS),
    products: z.array(rowSchemas.products).max(MAX_ROWS),
    testimonials: z.array(rowSchemas.testimonials).max(MAX_ROWS),
    faqs: z.array(rowSchemas.faqs).max(MAX_ROWS),
    pages: z.array(rowSchemas.pages).max(MAX_ROWS),
    page_versions: z.array(rowSchemas.page_versions).max(MAX_ROWS),
    redirects: z.array(rowSchemas.redirects).max(MAX_ROWS),
  }),
});

export type BackupContent = z.infer<typeof backupSchema>;

/* -------------------------------------------------------------- parsing */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Reads the uploaded backup (plain or gzipped JSON) and validates every content row. */
export async function readBackupUpload(formData: FormData): Promise<BackupContent> {
  const file = formData.get("backup");
  if (!(file instanceof Blob) || file.size === 0) throw new FormError("Choose a backup file first.");
  if (file.size > MAX_RESTORE_UPLOAD_BYTES * 1.1) throw new FormError("That file is too large to restore here.");

  let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    try {
      bytes = gunzipSync(bytes, { maxOutputLength: MAX_JSON_BYTES });
    } catch (error) {
      throw new FormError(
        (error as { code?: string }).code === "ERR_BUFFER_TOO_LARGE"
          ? "That backup is too large to restore here."
          : "The backup couldn’t be unpacked. Choose the .json file you downloaded from this page.",
      );
    }
  }
  if (bytes.byteLength > MAX_JSON_BYTES) throw new FormError("That backup is too large to restore here.");

  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new FormError("That file isn’t valid JSON. Choose the .json file you downloaded from this page.");
  }
  return parseBackup(data);
}

export function parseBackup(data: unknown): BackupContent {
  if (!isRecord(data) || data.format !== BACKUP_FORMAT)
    throw new FormError("This file isn’t an Ishita Traders backup.");
  if (data.version !== BACKUP_VERSION) {
    throw new FormError(
      `This backup uses format version ${String(data.version)}; this admin can only restore version ${BACKUP_VERSION}.`,
    );
  }
  const parsed = backupSchema.safeParse(data);
  if (!parsed.success) throw new FormError(describeIssue(parsed.error.issues[0]));
  const problem = integrityProblem(parsed.data);
  if (problem) throw new FormError(`The backup can’t be restored: ${problem}`);
  return parsed.data;
}

function describeIssue(issue: z.core.$ZodIssue | undefined) {
  if (!issue) return "The backup can’t be restored: it doesn’t look right.";
  const [root, table, index, ...rest] = issue.path;
  if (root === "tables" && typeof table === "string") {
    const label = backupTableInfo[table as ContentTable]?.label ?? table;
    const where =
      typeof index === "number"
        ? `${label}, row ${index + 1}${rest.length ? ` (${rest.map(String).join(".")})` : ""}`
        : label;
    return `The backup can’t be restored — ${where}: ${issue.message}.`;
  }
  return `The backup can’t be restored — ${issue.path.map(String).join(".") || "file"}: ${issue.message}.`;
}

/** Duplicate ids/slugs and dangling references inside the file (a damaged or hand-edited backup). */
function integrityProblem({ tables }: BackupContent): string | null {
  const duplicate = <T>(rows: T[], pick: (row: T) => string, what: string) => {
    const seen = new Set<string>();
    for (const row of rows) {
      const value = pick(row);
      if (seen.has(value)) return `two ${what} share “${value}”.`;
      seen.add(value);
    }
    return null;
  };
  const brandIds = new Set(tables.brands.map((row) => row.id));
  const categoryIds = new Set(tables.categories.map((row) => row.id));
  const pageIds = new Set(tables.pages.map((row) => row.id));

  return (
    duplicate(tables.settings, (row) => row.key, "settings") ??
    duplicate(tables.brands, (row) => row.id, "brands") ??
    duplicate(tables.brands, (row) => row.slug, "brands") ??
    duplicate(tables.categories, (row) => row.id, "categories") ??
    duplicate(tables.categories, (row) => row.slug, "categories") ??
    duplicate(tables.products, (row) => row.id, "products") ??
    duplicate(tables.products, (row) => row.slug, "products") ??
    duplicate(tables.testimonials, (row) => row.id, "testimonials") ??
    duplicate(tables.faqs, (row) => row.id, "FAQs") ??
    duplicate(tables.pages, (row) => row.id, "HTML pages") ??
    duplicate(tables.pages, (row) => row.slug.toLowerCase(), "HTML pages") ??
    duplicate(tables.page_versions, (row) => row.id, "page versions") ??
    duplicate(tables.redirects, (row) => row.id, "redirects") ??
    duplicate(tables.redirects, (row) => row.source, "redirects") ??
    (tables.products.find((row) => row.brandId && !brandIds.has(row.brandId))
      ? "a product refers to a brand that isn’t in the backup."
      : null) ??
    (tables.products.find((row) => row.categoryId && !categoryIds.has(row.categoryId))
      ? "a product refers to a category that isn’t in the backup."
      : null) ??
    (tables.page_versions.find((row) => !pageIds.has(row.pageId))
      ? "a page version belongs to a page that isn’t in the backup."
      : null)
  );
}

/* ------------------------------------------------------------- planning */

interface TableSpec {
  table: PgTable;
  /** Primary key (settings use `key`). */
  key: PgColumn;
  /** Natural unique key besides the id. */
  unique?: { column: PgColumn; field: "slug" | "source" };
}

const specs: Record<ContentTable, TableSpec> = {
  settings: { table: settings, key: settings.key },
  brands: { table: brands, key: brands.id, unique: { column: brands.slug, field: "slug" } },
  categories: { table: categories, key: categories.id, unique: { column: categories.slug, field: "slug" } },
  products: { table: products, key: products.id, unique: { column: products.slug, field: "slug" } },
  testimonials: { table: testimonials, key: testimonials.id },
  faqs: { table: faqs, key: faqs.id },
  pages: { table: pages, key: pages.id, unique: { column: pages.slug, field: "slug" } },
  page_versions: { table: pageVersions, key: pageVersions.id },
  redirects: { table: redirects, key: redirects.id, unique: { column: redirects.source, field: "source" } },
};

type ContentRow = Record<string, unknown>;

const rowKey = (name: ContentTable, row: ContentRow) => String(name === "settings" ? row.key : row.id);

interface TableWork extends RestoreTablePlan {
  /** Ids of current rows the backup overwrites (same id). */
  overlapping: string[];
  /** Current row id → id of the backup row that takes its slug/address. */
  replacements: Map<string, string>;
}

async function planTables(tx: Tx, backup: BackupContent) {
  const work = new Map<ContentTable, TableWork>();
  for (const name of contentTables) {
    const spec = specs[name];
    const rows = backup.tables[name] as ContentRow[];
    const current = (await tx.select({ key: spec.key, unique: spec.unique?.column ?? spec.key }).from(spec.table)) as {
      key: string;
      unique: string;
    }[];

    const backupKeys = new Set(rows.map((row) => rowKey(name, row)));
    const currentKeys = new Set(current.map((row) => row.key));
    const overlapping = [...backupKeys].filter((key) => currentKeys.has(key));
    const replacements = new Map<string, string>();
    let keep = 0;
    const byUnique = spec.unique
      ? new Map(rows.map((row) => [String(row[spec.unique!.field]), rowKey(name, row)]))
      : new Map<string, string>();
    for (const row of current) {
      if (backupKeys.has(row.key)) continue;
      const replacement = byUnique.get(row.unique);
      if (spec.unique && replacement) replacements.set(row.key, replacement);
      else keep++;
    }
    work.set(name, {
      table: name,
      label: backupTableInfo[name].label,
      rows: rows.length,
      update: overlapping.length,
      create: rows.length - overlapping.length,
      replace: replacements.size,
      keep,
      overlapping,
      replacements,
    });
  }
  return work;
}

/** Media ids that restored content points to (images, datasheets, settings), at any depth. */
function referencedMediaIds(backup: BackupContent) {
  const found = new Set<string>();
  const visit = (value: unknown, depth: number) => {
    if (depth > 12 || value === null || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    const record = value as Record<string, unknown>;
    if (record.kind === "media" && typeof record.id === "string") found.add(record.id);
    if (typeof record.mediaId === "string") found.add(record.mediaId);
    for (const child of Object.values(record)) visit(child, depth + 1);
  };
  for (const name of contentTables) {
    if (name === "pages" || name === "page_versions") continue;
    visit(backup.tables[name], 0);
  }
  return found;
}

async function buildWarnings(tx: Tx, backup: BackupContent) {
  const warnings: string[] = [];
  const [mediaRows, userRows] = await Promise.all([
    tx.select({ id: media.id }).from(media),
    tx.select({ id: users.id }).from(users),
  ]);
  const mediaIds = new Set(mediaRows.map((row) => row.id));
  const missingMedia = [...referencedMediaIds(backup)].filter((mediaId) => !mediaIds.has(mediaId)).length;
  if (missingMedia > 0) {
    warnings.push(
      `${missingMedia} uploaded ${missingMedia === 1 ? "file is" : "files are"} used by this content but not in the media library (backups don’t include files) — re-upload ${missingMedia === 1 ? "it" : "them"} after restoring.`,
    );
  }
  const userIds = new Set(userRows.map((row) => row.id));
  const t = backup.tables;
  const refs = [
    ...t.settings.map((row) => row.updatedBy),
    ...t.products.flatMap((row) => [row.createdBy, row.updatedBy]),
    ...t.pages.flatMap((row) => [row.createdBy, row.updatedBy]),
    ...t.page_versions.map((row) => row.createdBy),
  ].filter((ref): ref is string => !!ref && !userIds.has(ref));
  if (refs.length > 0) {
    warnings.push(
      `${refs.length} “edited by” ${refs.length === 1 ? "link points" : "links point"} to users who no longer exist and will be cleared.`,
    );
  }
  return { warnings, userIds };
}

function toPlan(exportedAt: string, work: Map<ContentTable, TableWork>, warnings: string[]): RestorePlan {
  const tables = contentTables.map((name): RestoreTablePlan => {
    const { table, label, rows, update, create, replace, keep } = work.get(name)!;
    return { table, label, rows, update, create, replace, keep };
  });
  return { exportedAt, tables, totalRows: tables.reduce((sum, table) => sum + table.rows, 0), warnings };
}

/** What a restore would do, from a consistent read of the current database. Changes nothing. */
export async function planRestore(backup: BackupContent): Promise<RestorePlan> {
  const db = await getDb();
  return db.transaction(
    async (tx) => {
      const work = await planTables(tx, backup);
      const { warnings } = await buildWarnings(tx, backup);
      return toPlan(backup.exportedAt, work, warnings);
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

/* ------------------------------------------------------------- applying */

function* chunks<T>(rows: T[], maxRows = 100, maxChars = 2_000_000) {
  let chunk: T[] = [];
  let size = 0;
  for (const row of rows) {
    const rowSize = JSON.stringify(row).length;
    if (chunk.length > 0 && (chunk.length >= maxRows || size + rowSize > maxChars)) {
      yield chunk;
      chunk = [];
      size = 0;
    }
    chunk.push(row);
    size += rowSize;
  }
  if (chunk.length > 0) yield chunk;
}

/** INSERT … ON CONFLICT (key) DO UPDATE SET every column = the backup's value. */
async function upsertRows(tx: Tx, spec: TableSpec, rows: ContentRow[]) {
  if (rows.length === 0) return;
  const set: Record<string, SQL> = {};
  for (const [field, column] of Object.entries(getTableColumns(spec.table))) {
    if (column.name === spec.key.name) continue;
    // Identifiers come from our own schema, never from the file.
    set[field] = sql.raw(`excluded."${column.name}"`);
  }
  for (const chunk of chunks(rows)) {
    await tx
      .insert(spec.table)
      .values(chunk as never)
      .onConflictDoUpdate({ target: spec.key, set: set as never });
  }
}

/**
 * Writes the backup's content back, all or nothing. Re-checks inside the transaction that the
 * actor is still an active owner.
 */
export async function applyRestore(backup: BackupContent, actorId: string): Promise<RestorePlan> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [actor] = await tx
      .select({ role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, actorId));
    if (!actor?.isActive || actor.role !== "owner") throw new AuthError("Only an owner can restore a backup.");

    const work = await planTables(tx, backup);
    const { warnings, userIds } = await buildWarnings(tx, backup);
    const knownUser = (value: string | null) => (value && userIds.has(value) ? value : null);
    const t = backup.tables;

    // 1. Park the slugs/addresses of rows about to be overwritten or replaced, so no upsert can
    //    collide with a value that's only moving (e.g. two slugs swapped since the backup).
    for (const name of contentTables) {
      const spec = specs[name];
      const plan = work.get(name)!;
      const parked = [...plan.overlapping, ...plan.replacements.keys()];
      if (!spec.unique || parked.length === 0) continue;
      await tx
        .update(spec.table)
        .set({ [spec.unique.field]: sql`'__restore__' || ${spec.key}::text` } as never)
        .where(inArray(spec.key, parked));
    }

    // 2. Upsert in dependency order (brands/categories before products, pages before versions).
    const rows: Record<ContentTable, ContentRow[]> = {
      settings: t.settings.map((row) => ({ ...row, updatedBy: knownUser(row.updatedBy) })),
      brands: t.brands,
      categories: t.categories,
      products: t.products.map((row) => ({
        ...row,
        createdBy: knownUser(row.createdBy),
        updatedBy: knownUser(row.updatedBy),
      })),
      testimonials: t.testimonials,
      faqs: t.faqs,
      pages: t.pages.map((row) => ({
        ...row,
        createdBy: knownUser(row.createdBy),
        updatedBy: knownUser(row.updatedBy),
      })),
      page_versions: t.page_versions.map((row) => ({ ...row, createdBy: knownUser(row.createdBy) })),
      redirects: t.redirects,
    };
    for (const name of contentTables) await upsertRows(tx, specs[name], rows[name]);

    // 3. Move links from replaced rows to the rows that replaced them, then remove the replaced rows.
    const moves: [ContentTable, PgTable, PgColumn, string][] = [
      ["brands", products, products.brandId, "brandId"],
      ["categories", products, products.categoryId, "categoryId"],
      ["products", enquiries, enquiries.productId, "productId"],
      ["products", messages, messages.productId, "productId"],
      ["pages", pageVersions, pageVersions.pageId, "pageId"],
    ];
    for (const [name, table, column, field] of moves) {
      for (const [from, to] of work.get(name)!.replacements) {
        await tx
          .update(table)
          .set({ [field]: to } as never)
          .where(eq(column, from));
      }
    }
    for (const name of ["pages", "products", "categories", "brands", "redirects"] as const) {
      const replaced = [...work.get(name)!.replacements.keys()];
      if (replaced.length > 0) await tx.delete(specs[name].table).where(inArray(specs[name].key, replaced));
    }

    return toPlan(backup.exportedAt, work, warnings);
  });
}

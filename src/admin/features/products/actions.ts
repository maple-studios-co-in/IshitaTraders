"use server";

import { and, eq, inArray, like, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FileRef, ImageRef } from "@/admin/content/images";
import { stockStatuses, type StockStatus } from "@/admin/content/types";
import { hydrateFileRef, hydrateImageRef, hydrateImageRefs } from "@/admin/features/media/queries";
import type { ActionState } from "@/admin/lib/action-state";
import { omit } from "@/admin/lib/object";
import { FormError, formValue, parseOrThrow, runAction } from "@/admin/server/action";
import { diff, logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { cacheTags, refreshContent } from "@/admin/server/cache";
import { getDb } from "@/admin/server/db/client";
import { products, redirects } from "@/admin/server/db/schema";
import { moveRow, nextSortOrder } from "@/admin/server/ordering";

import { bulkOperations, productSchema, type ProductInput } from "./schema";

const idSchema = z.string().uuid();

function readProductForm(formData: FormData) {
  const optionalId = (key: string) => formValue.text(formData, key) || null;
  return {
    name: formValue.text(formData, "name"),
    slug: formValue.text(formData, "slug"),
    sku: formValue.text(formData, "sku"),
    brandId: optionalId("brandId"),
    categoryId: optionalId("categoryId"),
    typeLabel: formValue.text(formData, "typeLabel"),
    subtitle: formValue.text(formData, "subtitle"),
    badge: formValue.text(formData, "badge"),
    summary: formValue.text(formData, "summary"),
    description: formValue.text(formData, "description"),
    image: formValue.json<ImageRef | null>(formData, "image", null),
    gallery: formValue.json<ImageRef[]>(formData, "gallery", []),
    specs: formValue.json<unknown[]>(formData, "specs", []),
    applications: formValue.json<string[]>(formData, "applications", []),
    mrp: formValue.int(formData, "mrp"),
    price: formValue.int(formData, "price"),
    priceNote: formValue.text(formData, "priceNote"),
    showPrice: formValue.bool(formData, "showPrice"),
    stockStatus: formValue.text(formData, "stockStatus"),
    warranty: formValue.text(formData, "warranty"),
    datasheet: formValue.json<FileRef | null>(formData, "datasheet", null),
    isPublished: formValue.bool(formData, "isPublished"),
    isFeatured: formValue.bool(formData, "isFeatured"),
    seoTitle: formValue.text(formData, "seoTitle"),
    seoDescription: formValue.text(formData, "seoDescription"),
  };
}

/** Media references are rebuilt from the media table; applications are de-duplicated. */
async function normalise(values: ProductInput) {
  const [image, gallery, datasheet] = await Promise.all([
    hydrateImageRef(values.image),
    hydrateImageRefs(values.gallery),
    hydrateFileRef(values.datasheet),
  ]);
  const seen = new Set<string>();
  const applications = values.applications.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ...values, image, gallery, datasheet, applications };
}

export async function saveProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("products:write");
    const id = formValue.text(formData, "id");
    const values = await normalise(parseOrThrow(productSchema, readProductForm(formData)));
    const db = await getDb();

    const [clash] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.slug, values.slug), id ? ne(products.id, idSchema.parse(id)) : undefined))
      .limit(1);
    if (clash)
      throw new FormError("Please fix the highlighted fields.", {
        slug: "Another product already uses this web address.",
      });

    if (id) {
      const [before] = await db
        .select()
        .from(products)
        .where(eq(products.id, idSchema.parse(id)));
      if (!before) throw new FormError("This product no longer exists — it may have been deleted.");
      await db
        .update(products)
        .set({ ...values, updatedBy: user.id })
        .where(eq(products.id, before.id));
      if (before.slug !== values.slug) await redirectOldAddress(before.slug, values.slug);
      await logActivity(user, {
        action: "product.update",
        entityType: "product",
        entityId: before.id,
        summary: `Updated product “${values.name}”`,
        changes: diff(before as Record<string, unknown>, values as Record<string, unknown>),
      });
      refreshContent(cacheTags.catalog);
      return { message: "Product saved.", data: { id: before.id } };
    }

    const [created] = await db
      .insert(products)
      .values({ ...values, createdBy: user.id, updatedBy: user.id, sortOrder: await nextSortOrder(products) })
      .returning({ id: products.id });
    await logActivity(user, {
      action: "product.create",
      entityType: "product",
      entityId: created.id,
      summary: `Added product “${values.name}”`,
    });
    refreshContent(cacheTags.catalog);
    return { message: "Product created.", data: { id: created.id } };
  });
}

/**
 * Keeps shared links and Google results working after a product's web address changes: the old
 * address answers with a permanent redirect to the new one (shown under Admin → Redirects).
 */
async function redirectOldAddress(oldSlug: string, newSlug: string) {
  const from = `/products/${oldSlug}`;
  const to = `/products/${newSlug}`;
  const db = await getDb();
  await db.transaction(async (tx) => {
    // The new address must not itself redirect away (e.g. when renaming back).
    await tx.delete(redirects).where(eq(redirects.source, to));
    // Earlier renames point straight at the newest address: no redirect chains.
    await tx.update(redirects).set({ destination: to }).where(eq(redirects.destination, from));
    await tx
      .insert(redirects)
      .values({ source: from, destination: to, statusCode: 301 })
      .onConflictDoUpdate({ target: redirects.source, set: { destination: to, statusCode: 301, isActive: true } });
  });
  refreshContent(cacheTags.redirects);
}

/** Old addresses of deleted products no longer lead anywhere. */
async function dropRedirectsTo(slugs: string[]) {
  if (!slugs.length) return;
  const db = await getDb();
  await db.delete(redirects).where(
    inArray(
      redirects.destination,
      slugs.map((slug) => `/products/${slug}`),
    ),
  );
  refreshContent(cacheTags.redirects);
}

export async function deleteProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const user = await assertPermission("products:delete");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ name: products.name, slug: products.slug });
    if (deleted) {
      await dropRedirectsTo([deleted.slug]);
      await logActivity(user, {
        action: "product.delete",
        entityType: "product",
        entityId: id,
        summary: `Deleted product “${deleted.name}”`,
      });
      refreshContent(cacheTags.catalog);
    }
    return "Product deleted.";
  });
  if (result.status === "success" && formValue.text(formData, "redirectTo") === "list")
    redirect("/admin/products?deleted=1");
  return result;
}

/** Copies a product (hidden, "(copy)" name, free slug) and opens the copy. */
export async function duplicateProduct(_state: ActionState, formData: FormData): Promise<ActionState> {
  let copyId = "";
  const result = await runAction(async () => {
    const user = await assertPermission("products:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    const [source] = await db.select().from(products).where(eq(products.id, id));
    if (!source) throw new FormError("That product no longer exists.");

    const taken = new Set(
      (
        await db
          .select({ slug: products.slug })
          .from(products)
          .where(like(products.slug, `${source.slug}-copy%`))
      ).map((row) => row.slug),
    );
    let slug = `${source.slug}-copy`.slice(0, 80);
    for (let n = 2; taken.has(slug); n++) slug = `${source.slug}-copy-${n}`.slice(0, 80);

    const [created] = await db
      .insert(products)
      .values({
        ...omit(source, ["id", "createdAt", "updatedAt"]),
        name: `${source.name} (copy)`.slice(0, 140),
        slug,
        isPublished: false,
        isFeatured: false,
        sortOrder: await nextSortOrder(products),
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: products.id });
    copyId = created.id;
    await logActivity(user, {
      action: "product.duplicate",
      entityType: "product",
      entityId: created.id,
      summary: `Duplicated “${source.name}”`,
    });
    return "Copy created — it stays hidden until you publish it.";
  });
  if (result.status === "success" && copyId) redirect(`/admin/products/${copyId}?copied=1`);
  return result;
}

/** One-click switches on the list (published / featured). Plain form action: works without JavaScript. */
export async function toggleProductFlag(formData: FormData) {
  const user = await assertPermission("products:write");
  const id = idSchema.parse(formValue.text(formData, "id"));
  const field = formValue.text(formData, "field") === "isFeatured" ? "isFeatured" : "isPublished";
  const value = formValue.bool(formData, "value");
  const db = await getDb();
  const [row] = await db
    .update(products)
    .set({ [field]: value, updatedBy: user.id })
    .where(eq(products.id, id))
    .returning({ name: products.name });
  if (!row) return;
  const label = field === "isFeatured" ? (value ? "Featured" : "Unfeatured") : value ? "Published" : "Hid";
  await logActivity(user, {
    action: `product.${field === "isFeatured" ? "feature" : "publish"}`,
    entityType: "product",
    entityId: id,
    summary: `${label} “${row.name}”`,
  });
  refreshContent(cacheTags.catalog);
}

export async function bulkUpdateProducts(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const operation = z.enum(bulkOperations).parse(formValue.text(formData, "operation"));
    const user = await assertPermission(operation === "delete" ? "products:delete" : "products:write");
    const ids = z
      .array(idSchema)
      .min(1, "Select at least one product.")
      .max(500)
      .parse(formData.getAll("ids").map(String));
    const db = await getDb();
    const where = inArray(products.id, ids);

    if (operation === "delete") {
      const deleted = await db.delete(products).where(where).returning({ slug: products.slug });
      await dropRedirectsTo(deleted.map((row) => row.slug));
    } else {
      const changes =
        operation === "publish"
          ? { isPublished: true }
          : operation === "hide"
            ? { isPublished: false }
            : operation === "feature"
              ? { isFeatured: true }
              : operation === "unfeature"
                ? { isFeatured: false }
                : { stockStatus: operation as StockStatus };
      await db
        .update(products)
        .set({ ...changes, updatedBy: user.id })
        .where(where);
    }

    const verb = {
      publish: "Published",
      hide: "Hid",
      feature: "Featured",
      unfeature: "Unfeatured",
      in_stock: "Marked in stock",
      out_of_stock: "Marked out of stock",
      delete: "Deleted",
    }[operation];
    await logActivity(user, {
      action: `product.bulk.${operation}`,
      entityType: "product",
      summary: `${verb} ${ids.length} product${ids.length === 1 ? "" : "s"}`,
    });
    refreshContent(cacheTags.catalog);
    return `${verb} ${ids.length} product${ids.length === 1 ? "" : "s"}.`;
  });
}

export async function moveProduct(formData: FormData) {
  await assertPermission("products:write");
  const id = idSchema.parse(formValue.text(formData, "id"));
  await moveRow(products, id, formValue.text(formData, "direction") === "up" ? "up" : "down");
  refreshContent(cacheTags.catalog);
}

const priceRowSchema = z.object({
  id: idSchema,
  mrp: z.number().int().min(0).max(100_000_000).nullable(),
  price: z.number().int().min(0).max(100_000_000).nullable(),
  showPrice: z.boolean(),
  stockStatus: z.enum(stockStatuses),
});

/** The quick price & stock editor: saves only the rows that changed. */
export async function saveQuickPrices(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("products:write");
    const ids = formData.getAll("ids").map(String);
    const fieldErrors: Record<string, string> = {};
    const rows = ids.flatMap((id) => {
      const parsed = priceRowSchema.safeParse({
        id,
        mrp: formValue.int(formData, `mrp:${id}`),
        price: formValue.int(formData, `price:${id}`),
        showPrice: formValue.bool(formData, `show:${id}`),
        stockStatus: formValue.text(formData, `stock:${id}`),
      });
      if (!parsed.success) {
        fieldErrors[`price:${id}`] = "Use whole rupees.";
        return [];
      }
      const row = parsed.data;
      if (row.price !== null && row.mrp !== null && row.price > row.mrp)
        fieldErrors[`price:${id}`] = "Price is above MRP.";
      if (row.showPrice && row.price === null) fieldErrors[`price:${id}`] = "Enter a price to show it.";
      return [row];
    });
    if (Object.keys(fieldErrors).length) throw new FormError("Some rows need attention.", fieldErrors);

    const db = await getDb();
    const current = rows.length
      ? await db
          .select()
          .from(products)
          .where(
            inArray(
              products.id,
              rows.map((row) => row.id),
            ),
          )
      : [];
    const byId = new Map(current.map((row) => [row.id, row]));
    let changed = 0;
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    await db.transaction(async (tx) => {
      for (const row of rows) {
        const before = byId.get(row.id);
        if (!before) continue;
        const { id, ...values } = row;
        const rowChanges = diff(before as Record<string, unknown>, values);
        if (Object.keys(rowChanges).length === 0) continue;
        changed++;
        for (const [field, change] of Object.entries(rowChanges)) changes[`${before.name} · ${field}`] = change;
        await tx
          .update(products)
          .set({ ...values, updatedBy: user.id })
          .where(eq(products.id, id));
      }
    });
    if (changed === 0) return "Nothing changed.";
    await logActivity(user, {
      action: "product.prices",
      entityType: "product",
      summary: `Updated prices/stock for ${changed} product${changed === 1 ? "" : "s"}`,
      changes,
    });
    refreshContent(cacheTags.catalog);
    return `Saved ${changed} product${changed === 1 ? "" : "s"}.`;
  });
}

"use server";

import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import type { ImageRef } from "@/admin/content/images";
import { imageRefSchema } from "@/admin/content/settings-schema";
import { hydrateImageRef } from "@/admin/features/media/queries";
import type { ActionState } from "@/admin/lib/action-state";
import { SLUG_PATTERN } from "@/admin/lib/slug";
import { FormError, formValue, parseOrThrow, runAction } from "@/admin/server/action";
import { diff, logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { cacheTags, refreshContent } from "@/admin/server/cache";
import { getDb } from "@/admin/server/db/client";
import { brands, categories } from "@/admin/server/db/schema";
import { moveRow, nextSortOrder } from "@/admin/server/ordering";

const idSchema = z.string().uuid();
const text = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters.`);
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(60)
  .regex(SLUG_PATTERN, "Lowercase letters, numbers and hyphens only.");

/* ----------------------------------------------------------------- brands */

const brandSchema = z.object({
  name: text(60).min(2, "Enter the brand name."),
  slug,
  tabLabel: text(40),
  logo: imageRefSchema.nullable(),
  isActive: z.boolean(),
});

export async function saveBrand(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("products:write");
    const id = formValue.text(formData, "id");
    const parsed = parseOrThrow(brandSchema, {
      name: formValue.text(formData, "name"),
      slug: formValue.text(formData, "slug"),
      tabLabel: formValue.text(formData, "tabLabel"),
      logo: formValue.json<ImageRef | null>(formData, "logo", null),
      isActive: formValue.bool(formData, "isActive"),
    });
    const values = { ...parsed, logo: await hydrateImageRef(parsed.logo) };
    const db = await getDb();
    const [clash] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(and(eq(brands.slug, values.slug), id ? ne(brands.id, idSchema.parse(id)) : undefined))
      .limit(1);
    if (clash)
      throw new FormError("Please fix the highlighted fields.", {
        slug: "Another brand already uses this web address.",
      });

    if (id) {
      const [before] = await db
        .select()
        .from(brands)
        .where(eq(brands.id, idSchema.parse(id)));
      if (!before) throw new FormError("That brand no longer exists.");
      await db.update(brands).set(values).where(eq(brands.id, before.id));
      await logActivity(user, {
        action: "brand.update",
        entityType: "brand",
        entityId: before.id,
        summary: `Updated brand “${values.name}”`,
        changes: diff(before as Record<string, unknown>, values),
      });
    } else {
      const [created] = await db
        .insert(brands)
        .values({ ...values, sortOrder: await nextSortOrder(brands) })
        .returning({ id: brands.id });
      await logActivity(user, {
        action: "brand.create",
        entityType: "brand",
        entityId: created.id,
        summary: `Added brand “${values.name}”`,
      });
    }
    refreshContent(cacheTags.catalog);
    return id ? "Brand saved." : "Brand added.";
  });
}

export async function deleteBrand(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("products:delete");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    const [deleted] = await db.delete(brands).where(eq(brands.id, id)).returning({ name: brands.name });
    if (deleted) {
      await logActivity(user, {
        action: "brand.delete",
        entityType: "brand",
        entityId: id,
        summary: `Deleted brand “${deleted.name}”`,
      });
      refreshContent(cacheTags.catalog);
    }
    return "Brand deleted. Its products are kept, without a brand.";
  });
}

export async function moveBrand(formData: FormData) {
  await assertPermission("products:write");
  await moveRow(
    brands,
    idSchema.parse(formValue.text(formData, "id")),
    formValue.text(formData, "direction") === "up" ? "up" : "down",
  );
  refreshContent(cacheTags.catalog);
}

/* ------------------------------------------------------------- categories */

const categorySchema = z.object({
  name: text(60).min(2, "Enter the category name."),
  slug,
  label: text(40),
  description: text(400),
  image: imageRefSchema.nullable(),
  enquirySubject: text(80),
  showOnHomepage: z.boolean(),
});

export async function saveCategory(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("products:write");
    const id = formValue.text(formData, "id");
    const parsed = parseOrThrow(categorySchema, {
      name: formValue.text(formData, "name"),
      slug: formValue.text(formData, "slug"),
      label: formValue.text(formData, "label"),
      description: formValue.text(formData, "description"),
      image: formValue.json<ImageRef | null>(formData, "image", null),
      enquirySubject: formValue.text(formData, "enquirySubject"),
      showOnHomepage: formValue.bool(formData, "showOnHomepage"),
    });
    const values = { ...parsed, image: await hydrateImageRef(parsed.image) };
    const db = await getDb();
    const [clash] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.slug, values.slug), id ? ne(categories.id, idSchema.parse(id)) : undefined))
      .limit(1);
    if (clash)
      throw new FormError("Please fix the highlighted fields.", {
        slug: "Another category already uses this web address.",
      });

    if (id) {
      const [before] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, idSchema.parse(id)));
      if (!before) throw new FormError("That category no longer exists.");
      await db.update(categories).set(values).where(eq(categories.id, before.id));
      await logActivity(user, {
        action: "category.update",
        entityType: "category",
        entityId: before.id,
        summary: `Updated category “${values.name}”`,
        changes: diff(before as Record<string, unknown>, values),
      });
    } else {
      const [created] = await db
        .insert(categories)
        .values({ ...values, sortOrder: await nextSortOrder(categories) })
        .returning({ id: categories.id });
      await logActivity(user, {
        action: "category.create",
        entityType: "category",
        entityId: created.id,
        summary: `Added category “${values.name}”`,
      });
    }
    refreshContent(cacheTags.catalog);
    return id ? "Category saved." : "Category added.";
  });
}

export async function deleteCategory(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("products:delete");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    const [deleted] = await db.delete(categories).where(eq(categories.id, id)).returning({ name: categories.name });
    if (deleted) {
      await logActivity(user, {
        action: "category.delete",
        entityType: "category",
        entityId: id,
        summary: `Deleted category “${deleted.name}”`,
      });
      refreshContent(cacheTags.catalog);
    }
    return "Category deleted. Its products are kept, without a category.";
  });
}

export async function moveCategory(formData: FormData) {
  await assertPermission("products:write");
  await moveRow(
    categories,
    idSchema.parse(formValue.text(formData, "id")),
    formValue.text(formData, "direction") === "up" ? "up" : "down",
  );
  refreshContent(cacheTags.catalog);
}

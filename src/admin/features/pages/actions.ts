"use server";

import { and, desc, eq, notInArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isReservedSlug } from "@/admin/config/reserved-paths";
import type { ActionState } from "@/admin/lib/action-state";
import { formatBytes, formatDateTime } from "@/admin/lib/format";
import { isValidSlug, slugify } from "@/admin/lib/slug";
import { FormError, formValue, parseOrThrow, runAction } from "@/admin/server/action";
import { diff, logActivity } from "@/admin/server/audit";
import { assertPermission } from "@/admin/server/auth/guard";
import { cacheTags, refreshContent } from "@/admin/server/cache";
import { getDb, type Database } from "@/admin/server/db/client";
import { pages, pageVersions, redirects } from "@/admin/server/db/schema";

import {
  HTML_FILE_PATTERN,
  MAX_HTML_BYTES,
  PAGE_DESCRIPTION_MAX,
  PAGE_TITLE_MAX,
  byteLength,
  extractTitle,
  looksLikeHtml,
  sameDocument,
} from "./html";
import { findPageBySlug, findRedirectFrom, listSlugs } from "./queries";

/** Versions kept per page; older ones are pruned whenever a new one is saved. */
const MAX_VERSIONS = 20;

const idSchema = z.string().uuid();

const metaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the page a title.")
    .max(PAGE_TITLE_MAX, `Keep the title under ${PAGE_TITLE_MAX} characters.`),
  slug: z
    .string()
    .min(1, "Choose the page’s address.")
    .max(80, "Keep the address under 80 characters.")
    .refine(isValidSlug, "Use lowercase letters, numbers and single hyphens, e.g. diwali-offer.")
    .refine((slug) => !isReservedSlug(slug), "That address belongs to the website itself — choose another."),
  description: z
    .string()
    .trim()
    .max(PAGE_DESCRIPTION_MAX, `Keep the description under ${PAGE_DESCRIPTION_MAX} characters.`),
  noindex: z.boolean(),
});

type PageMeta = z.infer<typeof metaSchema>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

const fixFields = (fieldErrors: Record<string, string>) =>
  new FormError("Please fix the highlighted fields.", fieldErrors);

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && "name" in value;
}

/* ------------------------------------------------------------- reading input */

interface HtmlSource {
  html: string;
  fileName: string | null;
}

/** The page's HTML: an uploaded `.html` file (wins when provided) or the pasted code. */
async function readHtmlSource(formData: FormData): Promise<HtmlSource | null> {
  const file = formData.get("file");
  if (isUploadedFile(file) && file.size > 0) {
    const fileError = (message: string) => fixFields({ file: message });
    if (!HTML_FILE_PATTERN.test(file.name)) throw fileError("Choose an .html or .htm file.");
    if (file.size > MAX_HTML_BYTES)
      throw fileError(`That file is ${formatBytes(file.size)} — pages can be up to 2 MB.`);
    let html: string;
    try {
      // `fatal` rejects files in other encodings instead of silently garbling them; the BOM is dropped.
      html = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    } catch {
      throw fileError("This file isn’t saved as UTF-8 text. Re-save it as UTF-8 in your editor and upload it again.");
    }
    html = html.replace(/^\uFEFF/, "");
    if (!html.trim()) throw fileError("This file is empty.");
    if (!looksLikeHtml(html)) throw fileError("This file doesn’t look like an HTML page.");
    return { html, fileName: file.name };
  }

  const text = formData.get("html");
  if (typeof text === "string" && text.trim()) {
    // Browsers submit textarea line breaks as CRLF; store what was typed ("\n").
    const html = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const size = byteLength(html);
    if (size > MAX_HTML_BYTES) throw fixFields({ html: `The code is ${formatBytes(size)} — pages can be up to 2 MB.` });
    if (!looksLikeHtml(html))
      throw fixFields({
        html: "This doesn’t look like HTML. Paste the page’s full code, starting with <!DOCTYPE html>.",
      });
    return { html, fileName: null };
  }
  return null;
}

/** Title (defaults to the document's `<title>`), slug (defaults from the title), description, noindex. */
function readMeta(formData: FormData, html: string, fileName: string | null): PageMeta {
  const title = formValue.text(formData, "title") || extractTitle(html);
  const typedSlug = formValue.text(formData, "slug");
  const fileSlug = fileName ? slugify(fileName.replace(HTML_FILE_PATTERN, "")) : "";
  const slug = typedSlug ? slugify(typedSlug) : slugify(title) || fileSlug;
  return parseOrThrow(metaSchema, {
    title,
    slug,
    description: formValue.text(formData, "description"),
    noindex: formValue.bool(formData, "noindex"),
  });
}

/** A free variant of a taken slug: `diwali-offer-2`, `-3`… */
async function suggestSlug(base: string) {
  const taken = await listSlugs();
  for (let n = 2; n < 100; n++) {
    const candidate = `${base.slice(0, 80 - String(n).length - 1).replace(/-+$/, "")}-${n}`;
    if (!taken.has(candidate) && !isReservedSlug(candidate)) return candidate;
  }
  return `${base.slice(0, 70)}-${Date.now().toString(36)}`;
}

/** The slug must be unused by other pages and not the start of an active redirect. */
async function assertSlugAvailable(slug: string, pageId?: string) {
  const owner = await findPageBySlug(slug);
  if (owner && owner.id !== pageId) {
    throw fixFields({ slug: `/${slug} is already used by “${owner.title}”. Try ${await suggestSlug(slug)}.` });
  }
  const redirect = await findRedirectFrom(`/${slug}`);
  if (redirect) {
    throw fixFields({
      slug: `A redirect already sends /${slug} to ${redirect.destination}. Remove it under Redirects first, or choose another address.`,
    });
  }
}

/** Deletes all but the newest `MAX_VERSIONS` versions of a page. */
async function pruneVersions(tx: Transaction, pageId: string) {
  const newest = tx
    .select({ id: pageVersions.id })
    .from(pageVersions)
    .where(eq(pageVersions.pageId, pageId))
    .orderBy(desc(pageVersions.createdAt), desc(pageVersions.id))
    .limit(MAX_VERSIONS);
  await tx.delete(pageVersions).where(and(eq(pageVersions.pageId, pageId), notInArray(pageVersions.id, newest)));
}

const sizeChange = (before: string, after: string) => ({
  from: formatBytes(byteLength(before)),
  to: formatBytes(byteLength(after)),
});

/* -------------------------------------------------------------------- actions */

export async function createPage(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("pages:write");
    const source = await readHtmlSource(formData);
    if (!source) {
      throw new FormError("Add the page’s HTML first.", {
        file: "Choose an .html file to upload, or switch to “Paste code”.",
        html: "Paste the page’s HTML code, or switch to “Upload a file”.",
      });
    }
    const meta = readMeta(formData, source.html, source.fileName);
    await assertSlugAvailable(meta.slug);
    const publish = formValue.bool(formData, "publish");

    const db = await getDb();
    const [created] = await db
      .insert(pages)
      .values({
        ...meta,
        html: source.html,
        status: publish ? "published" : "draft",
        publishedAt: publish ? new Date() : null,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: pages.id });

    await logActivity(user, {
      action: "page.create",
      entityType: "page",
      entityId: created.id,
      summary: `Created HTML page “${meta.title}” at /${meta.slug}${publish ? " and published it" : " as a draft"}`,
      changes: {
        html: {
          from: null,
          to: `${formatBytes(byteLength(source.html))}${source.fileName ? ` from ${source.fileName}` : ""}`,
        },
      },
    });
    refreshContent(cacheTags.pages);
    return {
      message: publish ? `Page published at /${meta.slug}.` : "Page saved as a draft.",
      data: { id: created.id },
    };
  });
}

export async function updatePage(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("pages:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    const [before] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
    if (!before) throw new FormError("That page no longer exists — it may have been deleted.");

    const source = await readHtmlSource(formData);
    const html = source && !sameDocument(source.html, before.html) ? source.html : before.html;
    const meta = readMeta(formData, html, source?.fileName ?? null);

    const htmlChanged = html !== before.html;
    const titleChanged = meta.title !== before.title;
    const slugChanged = meta.slug !== before.slug;
    const changes = diff(before, meta, ["title", "slug", "description", "noindex"]);
    if (!htmlChanged && Object.keys(changes).length === 0) return "No changes to save.";
    if (slugChanged) await assertSlugAvailable(meta.slug, id);

    const redirectOldAddress =
      slugChanged && before.status === "published" && formValue.bool(formData, "redirectOldSlug");
    let redirectAdded = false;

    await db.transaction(async (tx) => {
      if (htmlChanged || titleChanged) {
        await tx.insert(pageVersions).values({
          pageId: id,
          title: before.title,
          html: before.html,
          note: htmlChanged && source?.fileName ? `Before uploading ${source.fileName}` : "Before edit",
          createdBy: user.id,
        });
        await pruneVersions(tx, id);
      }
      await tx
        .update(pages)
        .set({ ...meta, html, updatedBy: user.id })
        .where(eq(pages.id, id));

      if (redirectOldAddress) {
        const from = `/${before.slug}`;
        const to = `/${meta.slug}`;
        const [existing] = await tx
          .select({ id: redirects.id })
          .from(redirects)
          .where(eq(redirects.source, from))
          .limit(1);
        if (existing) {
          await tx
            .update(redirects)
            .set({ destination: to, statusCode: 301, isActive: true })
            .where(eq(redirects.id, existing.id));
        } else {
          await tx.insert(redirects).values({ source: from, destination: to, statusCode: 301 });
        }
        redirectAdded = true;
      }
    });

    await logActivity(user, {
      action: "page.update",
      entityType: "page",
      entityId: id,
      summary: `Updated HTML page “${meta.title}”${redirectAdded ? ` (old address /${before.slug} now redirects to /${meta.slug})` : ""}`,
      changes: htmlChanged ? { ...changes, html: sizeChange(before.html, html) } : changes,
    });
    if (redirectAdded) refreshContent(cacheTags.pages, cacheTags.redirects);
    else refreshContent(cacheTags.pages);
    return redirectAdded ? `Page saved. /${before.slug} now redirects to /${meta.slug}.` : "Page saved.";
  });
}

export async function setPageStatus(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("pages:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const status = formValue.text(formData, "status") === "published" ? "published" : "draft";
    const db = await getDb();
    const [before] = await db
      .select({ title: pages.title, slug: pages.slug, status: pages.status })
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);
    if (!before) throw new FormError("That page no longer exists — it may have been deleted.");
    if (before.status === status)
      return status === "published" ? "The page is already live." : "The page is already a draft.";

    if (status === "published") {
      const redirect = await findRedirectFrom(`/${before.slug}`);
      if (redirect) {
        throw new FormError(
          `A redirect already sends /${before.slug} to ${redirect.destination}. Remove it under Redirects before publishing.`,
        );
      }
    }

    await db
      .update(pages)
      .set({ status, updatedBy: user.id, ...(status === "published" ? { publishedAt: new Date() } : {}) })
      .where(eq(pages.id, id));
    await logActivity(user, {
      action: status === "published" ? "page.publish" : "page.unpublish",
      entityType: "page",
      entityId: id,
      summary: `${status === "published" ? "Published" : "Unpublished"} HTML page “${before.title}” (/${before.slug})`,
      changes: { status: { from: before.status, to: status } },
    });
    refreshContent(cacheTags.pages);
    return status === "published" ? `Published — live at /${before.slug}.` : "Unpublished — the page is a draft again.";
  });
}

export async function restorePageVersion(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("pages:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const versionId = idSchema.parse(formValue.text(formData, "versionId"));
    const db = await getDb();
    const [[page], [version]] = await Promise.all([
      db.select({ title: pages.title, html: pages.html }).from(pages).where(eq(pages.id, id)).limit(1),
      db
        .select()
        .from(pageVersions)
        .where(and(eq(pageVersions.id, versionId), eq(pageVersions.pageId, id)))
        .limit(1),
    ]);
    if (!page || !version) throw new FormError("That version no longer exists.");
    if (page.title === version.title && sameDocument(page.html, version.html))
      return "That version is the same as the current page.";

    const when = formatDateTime(version.createdAt);
    await db.transaction(async (tx) => {
      // The restore is itself undoable: the current content becomes a version first.
      await tx.insert(pageVersions).values({
        pageId: id,
        title: page.title,
        html: page.html,
        note: `Before restoring the version from ${when}`,
        createdBy: user.id,
      });
      await tx
        .update(pages)
        .set({ title: version.title, html: version.html, updatedBy: user.id })
        .where(eq(pages.id, id));
      await pruneVersions(tx, id);
    });

    await logActivity(user, {
      action: "page.restore",
      entityType: "page",
      entityId: id,
      summary: `Restored HTML page “${version.title}” to the version from ${when}`,
      changes: { ...diff({ title: page.title }, { title: version.title }), html: sizeChange(page.html, version.html) },
    });
    refreshContent(cacheTags.pages);
    return "Version restored. The content it replaced is saved in the history.";
  });
}

export async function duplicatePage(_state: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("pages:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    const [original] = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
    if (!original) throw new FormError("That page no longer exists — it may have been deleted.");

    const taken = await listSlugs();
    const isFree = (candidate: string) => !taken.has(candidate) && !isReservedSlug(candidate);
    const base = `${original.slug.slice(0, 75).replace(/-+$/, "")}-copy`;
    let slug = base;
    for (let n = 2; !isFree(slug) && n < 500; n++) slug = `${base.slice(0, 80 - String(n).length - 1)}-${n}`;
    if (!isFree(slug)) slug = `page-${Date.now().toString(36)}`;
    const title = `Copy of ${original.title}`.slice(0, PAGE_TITLE_MAX);

    const [created] = await db
      .insert(pages)
      .values({
        slug,
        title,
        description: original.description,
        html: original.html,
        noindex: original.noindex,
        status: "draft",
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({ id: pages.id });
    await logActivity(user, {
      action: "page.duplicate",
      entityType: "page",
      entityId: created.id,
      summary: `Duplicated HTML page “${original.title}” as a draft at /${slug}`,
    });
    refreshContent(cacheTags.pages);
    return { message: `Copied as a draft at /${slug}.`, data: { id: created.id } };
  });
}

export async function deletePage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const user = await assertPermission("pages:write");
    const id = idSchema.parse(formValue.text(formData, "id"));
    const db = await getDb();
    // Versions go with it (ON DELETE CASCADE).
    const [deleted] = await db
      .delete(pages)
      .where(eq(pages.id, id))
      .returning({ title: pages.title, slug: pages.slug, status: pages.status });
    if (deleted) {
      await logActivity(user, {
        action: "page.delete",
        entityType: "page",
        entityId: id,
        summary: `Deleted HTML page “${deleted.title}” (/${deleted.slug}, ${deleted.status})`,
      });
      refreshContent(cacheTags.pages);
    }
    return "Page deleted.";
  });
  // From the editor, go back to the list: the deleted page can't be shown any more.
  if (result.status === "success" && formValue.text(formData, "redirectTo") === "list")
    redirect("/admin/pages?deleted=1");
  return result;
}

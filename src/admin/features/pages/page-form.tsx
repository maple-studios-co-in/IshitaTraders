"use client";

import { Code, FileText, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { adminButton } from "@/admin/components/ui/button";
import { Checkbox, Field, FormSection, Input, Textarea, Toggle } from "@/admin/components/ui/form-controls";
import { Callout } from "@/admin/components/ui/primitives";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useFormAction } from "@/admin/components/ui/use-form-action";
import { useUnsavedChanges } from "@/admin/components/ui/use-unsaved-changes";
import { formatBytes } from "@/admin/lib/format";
import { slugify } from "@/admin/lib/slug";
import { cn } from "@/lib/cn";

import { createPage, updatePage } from "./actions";
import {
  HTML_FILE_PATTERN,
  MAX_HTML_BYTES,
  PAGE_DESCRIPTION_MAX,
  PAGE_TITLE_MAX,
  byteLength,
  extractTitle,
} from "./html";

export interface EditablePage {
  id: string;
  title: string;
  slug: string;
  description: string;
  noindex: boolean;
  status: "draft" | "published";
  html: string;
}

type Source = "upload" | "code";

/** Textareas use "\n" line breaks; documents uploaded from Windows may have "\r\n". */
const toEditorText = (html: string) => html.replace(/\r\n?/g, "\n");

/** While typing: lower-case, spaces → hyphens, nothing else allowed. Tidied fully on blur. */
const typingSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-");

/** Create or edit an uploaded HTML page: the document (file or code) plus title, address and SEO flags. */
export function PageForm({ page, siteUrl }: { page?: EditablePage; siteUrl: string }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const codeBeforeFile = useRef<string | null>(null);

  const [source, setSource] = useState<Source>(page ? "code" : "upload");
  const [code, setCode] = useState(() => toEditorText(page?.html ?? ""));
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [fileProblem, setFileProblem] = useState("");
  const [title, setTitle] = useState(page?.title ?? "");
  const [titleTouched, setTitleTouched] = useState(Boolean(page));
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(page));
  const [description, setDescription] = useState(page?.description ?? "");
  const [noindex, setNoindex] = useState(page?.noindex ?? false);

  const prefix = page ? `page-${page.id}` : "page-new";
  const siteHost = siteUrl.replace(/^https?:\/\//, "");
  const finalSlug = slug || slugify(title);
  const slugChanged = Boolean(page && page.status === "published" && finalSlug && finalSlug !== page.slug);
  const codeSize = useMemo(() => byteLength(code), [code]);

  // What's saved, to warn before leaving with unsaved edits.
  const [saved, setSaved] = useState(() => ({
    code: toEditorText(page?.html ?? ""),
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    description: page?.description ?? "",
    noindex: page?.noindex ?? false,
  }));

  // The stored document changed under the form (saved here, or a version restored): show it.
  const [shown, setShown] = useState({ html: page?.html ?? "", title: page?.title ?? "" });
  if (page && (page.html !== shown.html || page.title !== shown.title)) {
    setShown({ html: page.html, title: page.title });
    setCode(toEditorText(page.html));
    setTitle(page.title);
    setSaved((current) => ({ ...current, code: toEditorText(page.html), title: page.title }));
    setFile(null);
  }
  useEffect(() => {
    if (fileInput.current) fileInput.current.value = "";
    codeBeforeFile.current = null;
  }, [shown]);

  const dirty =
    file !== null ||
    code !== saved.code ||
    title !== saved.title ||
    finalSlug !== saved.slug ||
    description !== saved.description ||
    noindex !== saved.noindex;
  useUnsavedChanges(dirty);

  const { state, pending, onSubmit, errors } = useFormAction(page ? updatePage : createPage, {
    onSuccess: (result) => {
      const id = result.data?.id;
      // A new page opens in its editor.
      if (!page && typeof id === "string") return router.push(`/admin/pages/${id}`);
      // An edited page is re-rendered by the server; the uploaded file (if any) is now the saved code.
      setSaved({ code, title, slug: finalSlug, description, noindex });
      if (fileInput.current) fileInput.current.value = "";
      setFile(null);
      codeBeforeFile.current = null;
    },
  });

  // Move focus to the first field the server flagged.
  useEffect(() => {
    if (state.status !== "error" || !state.fieldErrors) return;
    form.current?.querySelector<HTMLElement>("[aria-invalid='true']:not([disabled])")?.focus();
  }, [state]);

  /** Fills the title (and the address, for new pages) from the document's <title> until edited by hand. */
  function adoptDocument(html: string, fileName?: string) {
    if (titleTouched) return;
    const detected = extractTitle(html);
    if (!detected && !fileName) return;
    if (detected) setTitle(detected);
    if (!slugTouched) setSlug(slugify(detected) || (fileName ? slugify(fileName.replace(HTML_FILE_PATTERN, "")) : ""));
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    setFileProblem("");
    if (!chosen) return clearFile();
    const problem = !HTML_FILE_PATTERN.test(chosen.name)
      ? "Choose an .html or .htm file."
      : chosen.size > MAX_HTML_BYTES
        ? `That file is ${formatBytes(chosen.size)} — pages can be up to 2 MB.`
        : "";
    if (problem) {
      event.target.value = "";
      setFile(null);
      setFileProblem(problem);
      return;
    }
    setFile({ name: chosen.name, size: chosen.size });
    const text = toEditorText((await chosen.text()).replace(/^\uFEFF/, ""));
    codeBeforeFile.current ??= code;
    // Mirrors the file into the code tab, so it can be reviewed (or tweaked there) before saving.
    setCode(text);
    adoptDocument(text, chosen.name);
  }

  function clearFile() {
    if (fileInput.current) fileInput.current.value = "";
    setFile(null);
    if (codeBeforeFile.current !== null) setCode(codeBeforeFile.current);
    codeBeforeFile.current = null;
  }

  return (
    <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-6">
      {page ? <input type="hidden" name="id" value={page.id} /> : null}

      <FormSection
        title="Page code"
        description={
          page
            ? "Edit the code, or upload a new file to replace it. Every change keeps the previous version."
            : "Upload the .html file you were given, or paste its code."
        }
      >
        <fieldset>
          <legend className="sr-only">How to add the page</legend>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(
              [
                { value: "upload", label: "Upload a file", icon: Upload },
                { value: "code", label: page ? "Edit code" : "Paste code", icon: Code },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/40 [&_svg]:size-4",
                  source === option.value ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-navy-900",
                )}
              >
                <input
                  type="radio"
                  name="source"
                  value={option.value}
                  checked={source === option.value}
                  onChange={() => setSource(option.value)}
                  className="sr-only"
                />
                <option.icon aria-hidden="true" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Both panels stay mounted so switching back keeps the chosen file; only the visible one is submitted. */}
        <div hidden={source !== "upload"}>
          <Field
            label="HTML file"
            htmlFor={`${prefix}-file`}
            error={fileProblem || errors.file}
            hint={
              page
                ? "An .html or .htm file, up to 2 MB. It replaces the current code when you save."
                : "An .html or .htm file, up to 2 MB. The title and address are filled in from the file’s <title>."
            }
          >
            <input
              ref={fileInput}
              id={`${prefix}-file`}
              type="file"
              name="file"
              accept=".html,.htm,text/html"
              disabled={source !== "upload"}
              onChange={onFileChange}
              aria-invalid={Boolean(fileProblem || errors.file) || undefined}
              className={cn(
                "block w-full cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-3 text-sm text-slate-600",
                "file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-navy-800 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-600",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 aria-invalid:border-red-500",
              )}
            />
          </Field>
          {file ? (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-leaf-600/25 bg-leaf-600/5 px-3 py-2 text-sm">
              <FileText className="size-4 shrink-0 text-leaf-700" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold text-slate-800">{file.name}</span>{" "}
                <span className="text-slate-500">· {formatBytes(file.size)}</span>
              </span>
              <button type="button" onClick={clearFile} className={adminButton({ variant: "ghost", size: "sm" })}>
                <X aria-hidden="true" /> Remove
              </button>
            </div>
          ) : null}
        </div>

        <div hidden={source !== "code"}>
          <Field
            label="HTML code"
            htmlFor={`${prefix}-html`}
            error={errors.html}
            aside={`${formatBytes(codeSize)} of 2 MB`}
            hint="The complete document, from <!DOCTYPE html> to </html>. It’s published exactly as written."
          >
            <Textarea
              id={`${prefix}-html`}
              name="html"
              rows={22}
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                adoptDocument(event.target.value);
              }}
              disabled={source !== "code"}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              placeholder={
                '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <title>Diwali offer</title>\n</head>\n<body>\n  …\n</body>\n</html>'
              }
              aria-invalid={Boolean(errors.html) || undefined}
              className="min-h-72 font-mono text-[12.5px] leading-5 whitespace-pre"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Details" description="How the page is named in the admin and found on the web.">
        <Field
          label="Title"
          htmlFor={`${prefix}-title`}
          error={errors.title}
          required
          aside={`${title.length}/${PAGE_TITLE_MAX}`}
          hint="For your reference in the admin. Defaults to the document’s <title>."
        >
          <Input
            id={`${prefix}-title`}
            name="title"
            value={title}
            maxLength={PAGE_TITLE_MAX}
            onChange={(event) => {
              setTitle(event.target.value);
              setTitleTouched(true);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            aria-invalid={Boolean(errors.title) || undefined}
          />
        </Field>

        <Field
          label="Address"
          htmlFor={`${prefix}-slug`}
          error={errors.slug}
          required
          hint={
            <>
              Lowercase letters, numbers and hyphens. The page will live at{" "}
              <span className="font-mono font-semibold break-all text-slate-700">
                {siteHost}/{finalSlug || "…"}
              </span>
            </>
          }
        >
          <div className="flex">
            <span className="inline-flex max-w-[45%] items-center truncate rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500 select-none">
              {siteHost}/
            </span>
            <Input
              id={`${prefix}-slug`}
              name="slug"
              value={slug}
              maxLength={80}
              placeholder={slugify(title) || "diwali-offer"}
              onChange={(event) => {
                setSlug(typingSlug(event.target.value));
                setSlugTouched(true);
              }}
              onBlur={() => setSlug((current) => slugify(current))}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={Boolean(errors.slug) || undefined}
              className="min-w-0 rounded-l-none font-mono"
            />
          </div>
        </Field>

        {slugChanged && page ? (
          <Callout tone="warning" title="Changing a live page’s address breaks links people have saved or shared.">
            <Checkbox
              name="redirectOldSlug"
              defaultChecked
              label={
                <>
                  Send visitors from <span className="font-mono">/{page.slug}</span> to the new address (recommended)
                </>
              }
              className="mt-1.5"
            />
          </Callout>
        ) : null}

        <Field
          label="Description"
          htmlFor={`${prefix}-description`}
          error={errors.description}
          aside={`${description.length}/${PAGE_DESCRIPTION_MAX}`}
          hint="Optional. A note about what the page is for, shown in the admin."
        >
          <Textarea
            id={`${prefix}-description`}
            name="description"
            rows={2}
            value={description}
            maxLength={PAGE_DESCRIPTION_MAX}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={Boolean(errors.description) || undefined}
          />
        </Field>

        <Toggle
          id={`${prefix}-noindex`}
          name="noindex"
          checked={noindex}
          onChange={(event) => setNoindex(event.target.checked)}
          label="Hide from search engines"
          description="Google and others won’t list this page, and it’s left out of the sitemap. Anyone with the link can still open it."
        />
        {page ? null : (
          <Toggle
            id={`${prefix}-publish`}
            name="publish"
            label="Publish now"
            description="Leave off to save a draft you can preview first. Drafts aren’t visible to visitors."
          />
        )}
      </FormSection>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {page ? null : (
          <Link href="/admin/pages" className={adminButton({ variant: "ghost" })}>
            Cancel
          </Link>
        )}
        <SubmitButton pending={pending} pendingLabel={page ? "Saving…" : "Creating…"}>
          {page ? "Save changes" : "Create page"}
        </SubmitButton>
      </div>
    </form>
  );
}

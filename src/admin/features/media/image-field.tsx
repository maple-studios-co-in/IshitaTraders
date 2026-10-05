"use client";

import { ArrowLeft, ArrowRight, FileText, ImagePlus, Images, LoaderCircle, Upload, X } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import { useRef, useState, type DragEvent, type ReactNode } from "react";

import { Button } from "@/admin/components/ui/button";
import { controlClass, Field } from "@/admin/components/ui/form-controls";
import { toast } from "@/admin/components/ui/toaster";
import { isStaticImageKey, staticImages, type FileRef, type ImageRef } from "@/admin/content/images";
import { formatBytes } from "@/admin/lib/format";
import { cn } from "@/lib/cn";

import { MediaPicker, type PickedMedia } from "./media-picker";
import { toFileRef, toImageRef } from "./types";
import { altFromFileName, DOCUMENT_ACCEPT, IMAGE_ACCEPT, uploadMedia } from "./upload-client";

function previewSource(ref: ImageRef): StaticImageData | string | null {
  if (ref.kind === "media") return ref.url;
  return isStaticImageKey(ref.key) ? staticImages[ref.key].image : null;
}

function refFromPick(picked: PickedMedia, alt: string): ImageRef {
  if (picked.source === "static")
    return { kind: "static", key: picked.key, alt: alt || staticImages[picked.key].label };
  return toImageRef(picked.item, alt || picked.item.alt || altFromFileName(picked.item.fileName));
}

function useDropZone(onFiles: (files: File[]) => void) {
  const [over, setOver] = useState(false);
  return {
    over,
    handlers: {
      onDragOver: (event: DragEvent) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (event: DragEvent) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        setOver(false);
        onFiles(Array.from(event.dataTransfer.files));
      },
    },
  };
}

function Thumb({
  source,
  className,
  aspect,
  children,
}: {
  source: StaticImageData | string | null;
  className?: string;
  aspect?: string;
  children?: ReactNode;
}) {
  return (
    <span
      style={aspect ? { aspectRatio: aspect } : undefined}
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-[#f3f9ff]",
        className,
      )}
    >
      {source ? (
        <Image src={source} alt="" fill sizes="176px" className="object-contain p-1.5" />
      ) : (
        <ImagePlus className="size-7 text-slate-300" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

const busyOverlay = (
  <span className="absolute inset-0 flex items-center justify-center bg-white/75">
    <LoaderCircle className="size-6 animate-spin text-navy-800" aria-hidden="true" />
  </span>
);

/* ------------------------------------------------------------ single image */

interface ImageFieldProps {
  /** Hidden input name; the value is the image reference as JSON ("" when empty). */
  name: string;
  label: ReactNode;
  defaultValue?: ImageRef | null;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Aspect ratio of the preview, e.g. "4/3" or "16/9". */
  aspect?: string;
  allowStatic?: boolean;
  onChange?: () => void;
}

/** Image chooser for forms: upload (drag & drop works), pick from the library, edit alt text. */
export function ImageField({
  name,
  label,
  defaultValue = null,
  hint,
  error,
  required,
  aspect = "4/3",
  allowStatic = true,
  onChange,
}: ImageFieldProps) {
  const [value, setValue] = useState<ImageRef | null>(defaultValue);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const update = (next: ImageRef | null) => {
    setValue(next);
    onChange?.();
  };

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const item = await uploadMedia(file, { accept: "image" });
      update(toImageRef(item, value?.alt || altFromFileName(file.name)));
      toast.success("Image uploaded.");
    } catch (uploadError) {
      toast.error((uploadError as Error).message);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const drop = useDropZone((files) => upload(files[0]));
  const altId = `${name}-alt`;

  return (
    <Field label={label} htmlFor={altId} hint={hint} error={error} required={required}>
      <div
        {...drop.handlers}
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-dashed p-3 transition-colors sm:flex-row sm:items-center",
          drop.over ? "border-brand-500 bg-brand-500/5" : "border-slate-300 bg-white",
          error && "border-red-400",
        )}
      >
        <Thumb source={value ? previewSource(value) : null} aspect={aspect} className="w-full shrink-0 sm:w-44">
          {busy ? busyOverlay : null}
        </Thumb>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
              <Upload aria-hidden="true" /> {value ? "Replace" : "Upload"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)} disabled={busy}>
              <Images aria-hidden="true" /> Library
            </Button>
            {value && !required ? (
              <Button size="sm" variant="danger-ghost" onClick={() => update(null)} disabled={busy}>
                <X aria-hidden="true" /> Remove
              </Button>
            ) : null}
          </div>
          {value ? (
            <input
              id={altId}
              value={value.alt}
              maxLength={200}
              onChange={(event) => update({ ...value, alt: event.target.value })}
              placeholder="Describe the image (for Google and screen readers)"
              aria-label="Image description (alt text)"
              className={cn(controlClass, "h-9")}
            />
          ) : (
            <p className="text-xs leading-relaxed text-slate-500">
              Drop an image here or upload one. JPG, PNG, WebP or AVIF; large photos are resized and converted to WebP
              automatically.
            </p>
          )}
        </div>
      </div>
      <input
        ref={fileInput}
        type="file"
        hidden
        accept={IMAGE_ACCEPT}
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <input type="hidden" name={name} value={value ? JSON.stringify(value) : ""} />
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        kind="image"
        allowStatic={allowStatic}
        onPick={(picked) => update(refFromPick(picked, value?.alt ?? ""))}
      />
    </Field>
  );
}

/* ---------------------------------------------------------------- gallery */

interface GalleryFieldProps {
  name: string;
  label: ReactNode;
  defaultValue?: ImageRef[];
  hint?: ReactNode;
  error?: string;
  max?: number;
  onChange?: () => void;
}

/** An ordered list of extra images (e.g. a product's gallery). */
export function GalleryField({ name, label, defaultValue = [], hint, error, max = 12, onChange }: GalleryFieldProps) {
  const [items, setItems] = useState<ImageRef[]>(defaultValue);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const update = (next: ImageRef[]) => {
    setItems(next.slice(0, max));
    onChange?.();
  };

  async function upload(files: File[]) {
    const room = max - items.length;
    if (room <= 0) return toast.error(`A gallery holds up to ${max} images.`);
    setBusy(true);
    const added: ImageRef[] = [];
    for (const file of files.slice(0, room)) {
      try {
        const item = await uploadMedia(file, { accept: "image" });
        added.push(toImageRef(item, altFromFileName(file.name)));
      } catch (uploadError) {
        toast.error((uploadError as Error).message);
      }
    }
    if (added.length) {
      setItems((current) => [...current, ...added].slice(0, max));
      onChange?.();
      toast.success(added.length === 1 ? "Image added." : `${added.length} images added.`);
    }
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  const move = (index: number, offset: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + offset, 0, item);
    update(next);
  };

  const drop = useDropZone(upload);

  return (
    <Field label={label} hint={hint} error={error} aside={`${items.length}/${max}`}>
      <div
        {...drop.handlers}
        className={cn(
          "rounded-xl border border-dashed p-3 transition-colors",
          drop.over ? "border-brand-500 bg-brand-500/5" : "border-slate-300 bg-white",
        )}
      >
        {items.length ? (
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item, index) => (
              <li key={`${item.kind === "media" ? item.id : item.key}-${index}`} className="flex flex-col gap-1.5">
                <Thumb source={previewSource(item)} className="aspect-[4/3] w-full">
                  <span className="absolute top-1 right-1 flex gap-0.5 rounded-md bg-white/90 p-0.5 shadow-sm">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      aria-label={`Move image ${index + 1} left`}
                    >
                      <ArrowLeft className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                      className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      aria-label={`Move image ${index + 1} right`}
                    >
                      <ArrowRight className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => update(items.filter((_, i) => i !== index))}
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                </Thumb>
                <input
                  value={item.alt}
                  maxLength={200}
                  onChange={(event) =>
                    update(items.map((current, i) => (i === index ? { ...current, alt: event.target.value } : current)))
                  }
                  placeholder="Description"
                  aria-label={`Description of image ${index + 1}`}
                  className={cn(controlClass, "h-8 text-xs")}
                />
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-3 text-center text-xs text-slate-500">
            No extra images. Drop photos here or use the buttons below.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fileInput.current?.click()}
            disabled={busy || items.length >= max}
          >
            {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}{" "}
            {busy ? "Uploading…" : "Upload images"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPickerOpen(true)}
            disabled={busy || items.length >= max}
          >
            <Images aria-hidden="true" /> Add from library
          </Button>
        </div>
      </div>
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        accept={IMAGE_ACCEPT}
        onChange={(event) => upload(Array.from(event.target.files ?? []))}
      />
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        kind="image"
        onPick={(picked) => update([...items, refFromPick(picked, "")])}
      />
    </Field>
  );
}

/* --------------------------------------------------------------- document */

interface FileFieldProps {
  name: string;
  label: ReactNode;
  defaultValue?: FileRef | null;
  hint?: ReactNode;
  error?: string;
  onChange?: () => void;
}

/** A single PDF (e.g. a product datasheet). */
export function FileField({ name, label, defaultValue = null, hint, error, onChange }: FileFieldProps) {
  const [value, setValue] = useState<FileRef | null>(defaultValue);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const update = (next: FileRef | null) => {
    setValue(next);
    onChange?.();
  };

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      update(toFileRef(await uploadMedia(file, { accept: "document" })));
      toast.success("Document uploaded.");
    } catch (uploadError) {
      toast.error((uploadError as Error).message);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const drop = useDropZone((files) => upload(files[0]));

  return (
    <Field label={label} hint={hint} error={error}>
      <div
        {...drop.handlers}
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3 transition-colors",
          drop.over ? "border-brand-500 bg-brand-500/5" : "border-slate-300 bg-white",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
          {busy ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <FileText className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          {value ? (
            <>
              <a
                href={value.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm font-semibold text-navy-900 hover:underline"
              >
                {value.name}
              </a>
              <p className="text-xs text-slate-500">{formatBytes(value.size)} · PDF</p>
            </>
          ) : (
            <p className="text-xs text-slate-500">No file. Drop a PDF here or upload one (max 4 MB).</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()} disabled={busy}>
            <Upload aria-hidden="true" /> {value ? "Replace" : "Upload PDF"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setPickerOpen(true)} disabled={busy}>
            <Images aria-hidden="true" /> Library
          </Button>
          {value ? (
            <Button size="sm" variant="danger-ghost" onClick={() => update(null)} disabled={busy}>
              <X aria-hidden="true" /> Remove
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={fileInput}
        type="file"
        hidden
        accept={DOCUMENT_ACCEPT}
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <input type="hidden" name={name} value={value ? JSON.stringify(value) : ""} />
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        kind="document"
        onPick={(picked) => {
          if (picked.source === "upload") update(toFileRef(picked.item));
        }}
      />
    </Field>
  );
}

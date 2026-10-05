"use client";

import { FileText, ImageOff, LoaderCircle, Search, Upload, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/admin/components/ui/button";
import { controlClass } from "@/admin/components/ui/form-controls";
import { toast } from "@/admin/components/ui/toaster";
import { staticImageKeys, staticImages, type StaticImageKey } from "@/admin/content/images";
import { formatBytes } from "@/admin/lib/format";
import { cn } from "@/lib/cn";

import type { MediaItem } from "./types";
import { DOCUMENT_ACCEPT, IMAGE_ACCEPT, uploadMedia } from "./upload-client";

export type PickedMedia = { source: "upload"; item: MediaItem } | { source: "static"; key: StaticImageKey };

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (picked: PickedMedia) => void;
  kind: "image" | "document";
  /** Offer the images bundled with the website too. */
  allowStatic?: boolean;
  title?: string;
}

/** The media library in a dialog: pick an upload, a bundled image, or upload something new. */
export function MediaPicker({ open, onClose, onPick, kind, allowStatic = kind === "image", title }: MediaPickerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"uploads" | "builtin">("uploads");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "uploads") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ kind, q: query, page: String(page) });
        const response = await fetch(`/api/admin/media?${params}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Couldn’t load the media library.");
        const result = (await response.json()) as { items: MediaItem[]; total: number };
        setItems((current) => (page === 1 ? result.items : [...current, ...result.items]));
        setTotal(result.total);
      } catch (error) {
        if ((error as Error).name !== "AbortError") toast.error((error as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, tab, kind, query, page, reload]);

  const pick = (picked: PickedMedia) => {
    onPick(picked);
    onClose();
  };

  async function handleUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const item = await uploadMedia(file, { accept: kind });
      toast.success(`${item.fileName} uploaded.`);
      pick({ source: "upload", item });
      setPage(1);
      setReload((value) => value + 1);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="media-picker-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      className="m-auto flex max-h-[min(760px,calc(100svh-2rem))] w-[min(920px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-navy-950/45 backdrop:backdrop-blur-[2px] [&:not([open])]:hidden"
    >
      <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <h2 id="media-picker-title" className="font-display text-lg font-bold text-navy-950">
          {title ?? (kind === "image" ? "Choose an image" : "Choose a document")}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            hidden
            accept={kind === "image" ? IMAGE_ACCEPT : DOCUMENT_ACCEPT}
            onChange={(event) => handleUpload(event.target.files)}
          />
          <Button size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
            {uploading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            {uploading ? "Uploading…" : "Upload new"}
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
        {allowStatic ? (
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm font-semibold" role="tablist" aria-label="Source">
            {(["uploads", "builtin"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors",
                  tab === value ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-navy-900",
                )}
              >
                {value === "uploads" ? "Uploads" : "Website images"}
              </button>
            ))}
          </div>
        ) : null}
        {tab === "uploads" ? (
          <label className="relative min-w-48 flex-1">
            <span className="sr-only">Search files</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by file name or description…"
              className={cn(controlClass, "h-9 pl-9")}
            />
          </label>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5" data-lenis-prevent>
        {tab === "builtin" ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {staticImageKeys.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => pick({ source: "static", key })}
                  className="group flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 text-left transition hover:border-navy-800 focus-visible:outline-2 focus-visible:outline-brand-500"
                >
                  <span className="relative block aspect-[4/3] bg-slate-50">
                    <Image src={staticImages[key].image} alt="" fill sizes="200px" className="object-contain p-2" />
                  </span>
                  <span className="truncate border-t border-slate-100 px-2.5 py-2 text-xs font-medium text-slate-700 group-hover:text-navy-900">
                    {staticImages[key].label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : items.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-slate-500">
            <ImageOff className="size-8 text-slate-300" aria-hidden="true" />
            {query
              ? "Nothing matches that search."
              : `No ${kind === "image" ? "images" : "documents"} uploaded yet — use “Upload new”.`}
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => pick({ source: "upload", item })}
                    className="group flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 text-left transition hover:border-navy-800 focus-visible:outline-2 focus-visible:outline-brand-500"
                  >
                    <span className="relative flex aspect-[4/3] items-center justify-center bg-slate-50">
                      {item.kind === "image" ? (
                        <Image src={item.url} alt="" fill sizes="200px" className="object-contain p-2" />
                      ) : (
                        <FileText className="size-10 text-red-500" aria-hidden="true" />
                      )}
                    </span>
                    <span className="border-t border-slate-100 px-2.5 py-2">
                      <span className="block truncate text-xs font-semibold text-slate-700 group-hover:text-navy-900">
                        {item.fileName}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {formatBytes(item.size)}
                        {item.width ? ` · ${item.width}×${item.height}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Loading…
              </p>
            ) : items.length < total ? (
              <div className="flex justify-center pt-5">
                <Button variant="secondary" size="sm" onClick={() => setPage((value) => value + 1)}>
                  Load more ({total - items.length} left)
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </dialog>
  );
}

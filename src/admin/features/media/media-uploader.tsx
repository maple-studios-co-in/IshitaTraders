"use client";

import { CircleAlert, CircleCheck, CloudUpload, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";

import { altFromFileName, DOCUMENT_ACCEPT, IMAGE_ACCEPT, uploadMedia } from "./upload-client";

interface Upload {
  id: number;
  name: string;
  status: "uploading" | "done" | "error";
  message?: string;
}

/** Drop zone for the media library: many files at once, one after another, with per-file status. */
export function MediaUploader() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const busy = uploads.some((upload) => upload.status === "uploading");

  async function start(files: File[]) {
    if (!files.length) return;
    const queued = files.map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      status: "uploading" as const,
    }));
    setUploads((current) => [...queued, ...current].slice(0, 12));
    for (const [index, file] of files.entries()) {
      const id = queued[index].id;
      try {
        await uploadMedia(file, {
          accept: file.type === "application/pdf" ? "document" : "image",
          alt: altFromFileName(file.name),
        });
        setUploads((current) => current.map((upload) => (upload.id === id ? { ...upload, status: "done" } : upload)));
      } catch (error) {
        setUploads((current) =>
          current.map((upload) =>
            upload.id === id ? { ...upload, status: "error", message: (error as Error).message } : upload,
          ),
        );
      }
    }
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          void start(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          over
            ? "border-brand-500 bg-brand-500/5"
            : "border-slate-300 bg-white hover:border-navy-800/50 hover:bg-surface/60",
        )}
      >
        {busy ? (
          <LoaderCircle className="size-8 animate-spin text-navy-800" aria-hidden="true" />
        ) : (
          <CloudUpload className="size-8 text-navy-800" aria-hidden="true" />
        )}
        <span className="font-display text-base font-bold text-navy-950">
          {busy ? "Uploading…" : "Drop images or PDFs here, or click to browse"}
        </span>
        <span className="text-xs text-slate-500">
          JPG, PNG, WebP, GIF, AVIF or PDF · up to 4 MB each · photos are resized and converted to WebP
        </span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={`${IMAGE_ACCEPT},${DOCUMENT_ACCEPT}`}
        onChange={(event) => void start(Array.from(event.target.files ?? []))}
      />
      {uploads.length ? (
        <ul className="flex flex-col gap-1.5 text-sm" aria-live="polite">
          {uploads.map((upload) => (
            <li key={upload.id} className="flex items-start gap-2">
              {upload.status === "uploading" ? (
                <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-slate-400" aria-hidden="true" />
              ) : upload.status === "done" ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-leaf-600" aria-hidden="true" />
              ) : (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" />
              )}
              <span className="min-w-0">
                <span className="font-medium text-slate-700">{upload.name}</span>
                {upload.message ? <span className="block text-xs text-red-600">{upload.message}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

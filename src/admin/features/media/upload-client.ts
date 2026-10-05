import { MAX_UPLOAD_BYTES, type MediaItem } from "./types";

const RESIZABLE = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_EDGE = 2400;

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";
export const DOCUMENT_ACCEPT = "application/pdf";

async function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Shrinks large photos in the browser before uploading (phone photos are often 4–12 MB). The
 * server still normalises everything to WebP, strips EXIF and builds the blur placeholder.
 */
export async function prepareImage(file: File): Promise<File> {
  if (!RESIZABLE.has(file.type) || typeof createImageBitmap !== "function") return file;
  if (file.size <= 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    // PNG keeps its transparency through WebP where the browser can encode it; photos go to JPEG.
    const type = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    const blob = await toBlob(canvas, type, 0.9);
    if (!blob || blob.size >= file.size) return file;
    const extension = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png";
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.${extension}`, { type: blob.type });
  } catch {
    return file;
  }
}

/** Uploads one file to the media library and returns it. Throws an Error with a friendly message. */
export async function uploadMedia(
  file: File,
  options: { accept: "image" | "document"; alt?: string },
): Promise<MediaItem> {
  const prepared = options.accept === "image" ? await prepareImage(file) : file;
  if (prepared.size > MAX_UPLOAD_BYTES) {
    throw new Error(`“${file.name}” is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`);
  }
  const body = new FormData();
  body.set("file", prepared);
  body.set("accept", options.accept);
  if (options.alt) body.set("alt", options.alt);

  const response = await fetch("/api/admin/media", { method: "POST", body });
  const result = (await response.json().catch(() => null)) as { item?: MediaItem; error?: string } | null;
  if (!response.ok || !result?.item) throw new Error(result?.error ?? `Upload failed (error ${response.status}).`);
  return result.item;
}

/** "exide_it500-front.jpg" → "exide it500 front", a starting point for alt text. */
export function altFromFileName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

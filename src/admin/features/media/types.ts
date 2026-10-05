import type { FileRef, ImageRef } from "@/admin/content/images";

/** An uploaded file as the admin UI sees it (client-safe, serialisable). */
export interface MediaItem {
  id: string;
  kind: "image" | "document";
  fileName: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  alt: string;
  url: string;
  createdAt: string;
}

/**
 * Serverless platforms reject request bodies above ~4.5 MB (Vercel), so uploads are capped at
 * 4 MB. Photos are downscaled in the browser first, so this only ever bites very large PDFs.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const toImageRef = (item: MediaItem, alt = item.alt): ImageRef => ({
  kind: "media",
  id: item.id,
  url: item.url,
  width: item.width,
  height: item.height,
  blurDataUrl: item.blurDataUrl,
  alt,
});

export const toFileRef = (item: MediaItem): FileRef => ({
  mediaId: item.id,
  url: item.url,
  name: item.fileName,
  size: item.size,
});

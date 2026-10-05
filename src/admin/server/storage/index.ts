import "server-only";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { media, mediaBlobs } from "../db/schema";
import { env } from "../env";
import { sha256 } from "../security/request";

export type MediaRow = typeof media.$inferSelect;

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

type Detected = { ext: "png" | "jpg" | "webp" | "gif" | "avif" | "pdf"; mime: string; kind: "image" | "document" };

export const UPLOAD_LIMITS = { image: 8 * 1024 * 1024, document: 15 * 1024 * 1024 } as const;

/**
 * Identifies files by their first bytes, never by the name or the browser's claimed type.
 * SVG and HTML are deliberately not accepted (they can carry scripts).
 */
export function detectFileType(bytes: Uint8Array): Detected | null {
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));
  if (bytes[0] === 0x89 && ascii(1, 3) === "PNG") return { ext: "png", mime: "image/png", kind: "image" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { ext: "jpg", mime: "image/jpeg", kind: "image" };
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return { ext: "webp", mime: "image/webp", kind: "image" };
  if (ascii(0, 4) === "GIF8") return { ext: "gif", mime: "image/gif", kind: "image" };
  if (ascii(4, 4) === "ftyp" && /avif|avis/.test(ascii(8, 4)))
    return { ext: "avif", mime: "image/avif", kind: "image" };
  if (ascii(0, 5) === "%PDF-") return { ext: "pdf", mime: "application/pdf", kind: "document" };
  return null;
}

/** Safe, readable file names: `Exide IT500 (final).PNG` → `exide-it500-final.png`. */
export function safeFileName(name: string, ext: string) {
  const base = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 60);
  return `${base || "file"}.${ext}`;
}

interface Processed {
  bytes: Uint8Array;
  ext: string;
  mime: string;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
}

/** Normalises images: auto-rotate, strip EXIF (GPS!), cap at 2400px, convert to WebP, make a blur placeholder. */
async function processImage(bytes: Uint8Array, detected: Detected): Promise<Processed> {
  try {
    const { default: sharp } = await import("sharp");
    if (detected.ext === "gif") {
      const meta = await sharp(bytes, { animated: true }).metadata();
      return {
        bytes,
        ext: "gif",
        mime: "image/gif",
        width: meta.width ?? null,
        height: meta.pageHeight ?? meta.height ?? null,
        blurDataUrl: null,
      };
    }
    const pipeline = sharp(bytes, { failOn: "error" })
      .rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true });
    const { data, info } = await pipeline.webp({ quality: 86 }).toBuffer({ resolveWithObject: true });
    const blur = await sharp(data).resize(12, 12, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
    return {
      bytes: new Uint8Array(data),
      ext: "webp",
      mime: "image/webp",
      width: info.width,
      height: info.height,
      blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
    };
  } catch (error) {
    if (error instanceof Error && /unsupported|corrupt|bad|premature/i.test(error.message)) {
      throw new UploadError("That image looks damaged or unsupported. Try exporting it again as JPG or PNG.");
    }
    // sharp unavailable: keep the original bytes untouched.
    return { bytes, ext: detected.ext, mime: detected.mime, width: null, height: null, blurDataUrl: null };
  }
}

export interface UploadInput {
  name: string;
  bytes: Uint8Array;
  alt?: string;
  /** Restrict what this upload slot accepts. */
  accept?: "image" | "document" | "any";
}

/** Validates, processes and stores an upload; returns the media row. */
export async function storeUpload(input: UploadInput, createdBy: string | null): Promise<MediaRow> {
  const detected = detectFileType(input.bytes);
  if (!detected) throw new UploadError("Only JPG, PNG, WebP, GIF, AVIF images and PDF documents are accepted.");
  if (input.accept && input.accept !== "any" && detected.kind !== input.accept) {
    throw new UploadError(input.accept === "image" ? "Please choose an image file." : "Please choose a PDF document.");
  }
  if (input.bytes.byteLength > UPLOAD_LIMITS[detected.kind]) {
    throw new UploadError(`That file is too large (max ${UPLOAD_LIMITS[detected.kind] / 1024 / 1024} MB).`);
  }

  const processed: Processed =
    detected.kind === "image"
      ? await processImage(input.bytes, detected)
      : { bytes: input.bytes, ext: detected.ext, mime: detected.mime, width: null, height: null, blurDataUrl: null };

  const id = randomUUID();
  const fileName = safeFileName(input.name, processed.ext);
  const checksum = sha256(processed.bytes);
  const db = await getDb();

  let url: string;
  let storage: "database" | "blob";
  if (env.blobToken) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`media/${id}/${fileName}`, Buffer.from(processed.bytes), {
      access: "public",
      contentType: processed.mime,
      addRandomSuffix: false,
      cacheControlMaxAge: 31_536_000,
      token: env.blobToken,
    });
    url = blob.url;
    storage = "blob";
  } else {
    url = `/media/${id}/${fileName}`;
    storage = "database";
  }

  const [row] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(media)
      .values({
        id,
        kind: detected.kind,
        fileName,
        contentType: processed.mime,
        size: processed.bytes.byteLength,
        width: processed.width,
        height: processed.height,
        blurDataUrl: processed.blurDataUrl,
        alt: input.alt?.trim().slice(0, 200) ?? "",
        storage,
        url,
        checksum,
        createdBy,
      })
      .returning();
    if (storage === "database") await tx.insert(mediaBlobs).values({ mediaId: id, data: processed.bytes });
    return inserted;
  });
  return row;
}

export async function deleteStoredMedia(row: MediaRow) {
  const db = await getDb();
  if (row.storage === "blob" && env.blobToken) {
    const { del } = await import("@vercel/blob");
    await del(row.url, { token: env.blobToken }).catch(() => {});
  }
  await db.delete(media).where(eq(media.id, row.id));
}

/** Bytes of a database-stored file, for the `/media/...` route. */
export async function readDatabaseMedia(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      contentType: media.contentType,
      fileName: media.fileName,
      checksum: media.checksum,
      size: media.size,
      data: mediaBlobs.data,
    })
    .from(media)
    .innerJoin(mediaBlobs, eq(mediaBlobs.mediaId, media.id))
    .where(eq(media.id, id))
    .limit(1);
  return row ?? null;
}

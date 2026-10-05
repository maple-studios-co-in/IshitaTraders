import { NextResponse } from "next/server";

import { listMedia, toMediaItem } from "@/admin/features/media/queries";
import { MAX_UPLOAD_BYTES } from "@/admin/features/media/types";
import { logActivity } from "@/admin/server/audit";
import { AuthError, assertPermission } from "@/admin/server/auth/guard";
import { isSameOriginRequest } from "@/admin/server/security/request";
import { storeUpload, UploadError } from "@/admin/server/storage";

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Upload one file (multipart field `file`; optional `alt`, `accept` = image | document). */
export async function POST(request: Request) {
  try {
    const user = await assertPermission("media:write");
    if (!isSameOriginRequest(request)) return json({ error: "Uploads must come from the admin." }, 403);
    if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
      return json({ error: `That file is too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).` }, 413);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return json({ error: "Choose a file to upload." }, 400);
    const acceptValue = String(form.get("accept") ?? "any");
    const accept = acceptValue === "image" || acceptValue === "document" ? acceptValue : "any";

    const row = await storeUpload(
      { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()), alt: String(form.get("alt") ?? ""), accept },
      user.id,
    );
    await logActivity(user, {
      action: "media.upload",
      entityType: "media",
      entityId: row.id,
      summary: `Uploaded ${row.fileName}`,
    });
    return json({ item: toMediaItem(row) }, 201);
  } catch (error) {
    if (error instanceof AuthError) return json({ error: error.message }, 401);
    if (error instanceof UploadError) return json({ error: error.message }, 400);
    console.error("[media] Upload failed", error);
    return json({ error: "Upload failed. Please try again." }, 500);
  }
}

/** The media library for pickers: `?kind=image|document&q=&page=`. */
export async function GET(request: Request) {
  try {
    await assertPermission("media:write");
  } catch (error) {
    if (error instanceof AuthError) return json({ error: error.message }, 401);
    throw error;
  }
  const params = new URL(request.url).searchParams;
  const kindParam = params.get("kind");
  const kind = kindParam === "image" || kindParam === "document" ? kindParam : undefined;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const result = await listMedia({ q, kind, page, pageSize: 30 });
  return json({ ...result, page, pageSize: 30 });
}

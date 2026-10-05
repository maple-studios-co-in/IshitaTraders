import { readDatabaseMedia } from "@/admin/server/storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Serves uploads kept in the database (when Vercel Blob isn't connected). URLs contain the file's
 * id, so contents never change behind a URL and can be cached forever by browsers and the CDN.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const file = await readDatabaseMedia(id).catch((error: unknown) => {
    console.error("[media] Failed to read", id, error);
    return null;
  });
  if (!file) return new Response("Not found", { status: 404 });

  const etag = `"${file.checksum}"`;
  const headers = new Headers({
    "Content-Type": file.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `inline; filename="${file.fileName}"`,
  });
  // Images can never run scripts; PDFs are left to the browser's own sandboxed viewer.
  if (file.contentType.startsWith("image/"))
    headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");

  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  headers.set("Content-Length", String(file.data.byteLength));
  return new Response(new Uint8Array(file.data), { headers });
}

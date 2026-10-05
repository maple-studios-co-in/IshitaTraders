import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getPreviewDocument } from "@/admin/features/pages/queries";
import { htmlDocumentResponse } from "@/admin/features/pages/serve";
import { AuthError, assertPermission, getCurrentUser } from "@/admin/server/auth/guard";

const uuid = z.string().uuid();

const plain = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

/**
 * Admin preview of a page (draft or live) or one of its saved versions (`?version=<id>`), served
 * with the same sandbox as the public page. Opened in a new tab: the site refuses to be framed.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/admin/pages/[id]/preview">) {
  try {
    await assertPermission("pages:write");
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    if (await getCurrentUser()) return plain("You don’t have permission to preview pages.", 403);
    redirect(`/admin/login?next=${encodeURIComponent(`${request.nextUrl.pathname}${request.nextUrl.search}`)}`);
  }

  const { id } = await params;
  const version = request.nextUrl.searchParams.get("version");
  if (!uuid.safeParse(id).success || (version !== null && !uuid.safeParse(version).success))
    return plain("Page not found.", 404);

  const html = await getPreviewDocument(id, version ?? undefined);
  if (html === null) return plain(version ? "That version no longer exists." : "Page not found.", 404);

  return htmlDocumentResponse(html, { noindex: true, cacheControl: "private, no-store" });
}

import { backupFileName, backupRowCount, buildBackup } from "@/admin/features/backup/export";
import { logActivity } from "@/admin/server/audit";
import { AuthError, assertPermission, getCurrentUser } from "@/admin/server/auth/guard";
import type { SessionUser } from "@/admin/server/auth/session";

const privateHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

function problem(status: number, error: string) {
  return Response.json({ error }, { status, headers: privateHeaders });
}

/**
 * GET /api/admin/backup — the whole admin database as a JSON file download (admins and owners).
 * Never includes password hashes, sessions or uploaded file bytes (see features/backup/export.ts).
 */
export async function GET(request: Request) {
  // Same-origin requests and typed/bookmarked URLs only: a link or form on another site can't
  // make a signed-in browser download the backup.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return problem(403, "Cross-site requests are not allowed.");

  let user: SessionUser;
  try {
    user = await assertPermission("backup:export");
  } catch (error) {
    if (error instanceof AuthError) return problem((await getCurrentUser()) ? 403 : 401, error.message);
    throw error;
  }

  let body: string;
  let rows: number;
  try {
    const backup = await buildBackup();
    body = JSON.stringify(backup);
    rows = backupRowCount(backup);
  } catch (error) {
    console.error("[backup] export failed", error);
    return problem(500, "The backup couldn’t be created. Please try again.");
  }

  await logActivity(user, {
    action: "backup.export",
    entityType: "backup",
    summary: `Downloaded a backup (${rows.toLocaleString("en-IN")} rows)`,
  });

  return new Response(body, {
    headers: {
      ...privateHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${backupFileName()}"`,
    },
  });
}

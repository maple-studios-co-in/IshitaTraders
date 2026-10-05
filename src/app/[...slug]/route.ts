import type { NextRequest } from "next/server";

import { servePath } from "@/admin/site/serve-path";

/**
 * Catch-all for URLs no other route handles (static routes like `/`, `/products`, `/admin/*`,
 * `/api/*` and `/media/*` always win): uploaded HTML pages, admin redirects, else the branded 404.
 */
export function GET(request: NextRequest) {
  return servePath(request);
}

export function HEAD(request: NextRequest) {
  return servePath(request);
}

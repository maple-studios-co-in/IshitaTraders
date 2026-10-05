import "server-only";

import { headers } from "next/headers";

import { env } from "@/admin/server/env";
import { siteConfig } from "@/config/site";

/**
 * The origin providers should call: the canonical site URL in production; in development the
 * host the admin is being viewed on (so a tunnel like ngrok shows its own public URL).
 */
export async function publicOrigin(): Promise<string> {
  if (env.isProduction) return siteConfig.url;
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0].trim().toLowerCase();
  if (/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host) && (proto === "http" || proto === "https")) return `${proto}://${host}`;
  return siteConfig.url;
}

/** Database host for display — never the user name or password. */
export function databaseHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

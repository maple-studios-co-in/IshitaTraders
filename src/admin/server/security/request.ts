import "server-only";

import { createHash, createHmac } from "node:crypto";

import { headers } from "next/headers";

import { env } from "../env";

export interface RequestMeta {
  ip: string;
  userAgent: string;
  origin: string;
}

/** Client IP (first hop of x-forwarded-for, as set by Vercel and most proxies) and user agent. */
export async function getRequestMeta(): Promise<RequestMeta> {
  const h = await headers();
  return metaFromHeaders(h);
}

export function metaFromHeaders(h: Headers): RequestMeta {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || h.get("x-real-ip")?.trim() || "",
    userAgent: (h.get("user-agent") ?? "").slice(0, 400),
    origin: h.get("origin") ?? "",
  };
}

/**
 * CSRF defence for cookie-authenticated Route Handlers (Server Actions check this themselves):
 * the browser's Origin / Sec-Fetch-Site must say the request came from this site.
 */
export function isSameOriginRequest(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== null;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Non-reversible visitor fingerprint for spam control and dedupe — raw IPs are never stored for visitors. */
export function hashIp(ip: string) {
  if (!ip) return "";
  return createHmac("sha256", env.authSecret).update(`ip:${ip}`).digest("hex").slice(0, 32);
}

export function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

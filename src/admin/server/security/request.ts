import "server-only";

import { createHash, createHmac } from "node:crypto";

import { headers } from "next/headers";

import { siteConfig } from "@/config/site";

import { env } from "../env";

export interface RequestMeta {
  ip: string;
  userAgent: string;
  origin: string;
}

/** Client IP (see `clientIp`) and user agent of the current request. */
export async function getRequestMeta(): Promise<RequestMeta> {
  const h = await headers();
  return metaFromHeaders(h);
}

/**
 * The visitor's address from X-Forwarded-For. Each proxy appends the address it received the
 * request from, so only the entries our own proxies wrote can be trusted: counted from the right,
 * TRUSTED_PROXY_HOPS of them (1 on Vercel and Hostinger). Anything further left was sent by the
 * visitor and could be made up to dodge rate limits.
 */
function clientIp(h: Headers) {
  const fromProxy = env.clientIpHeader ? h.get(env.clientIpHeader)?.trim() : "";
  if (fromProxy) return fromProxy;
  const chain = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (chain.length) return chain[Math.max(0, chain.length - env.trustedProxyHops)];
  return h.get("x-real-ip")?.trim() ?? "";
}

export function metaFromHeaders(h: Headers): RequestMeta {
  return {
    ip: clientIp(h),
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
    const originHost = new URL(origin).host;
    // The site's own address also counts, for hosts whose proxy rewrites the Host header.
    return originHost === host || originHost === new URL(siteConfig.url).host;
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

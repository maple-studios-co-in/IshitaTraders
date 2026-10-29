import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

/**
 * `next dev` only serves its scripts to known hosts. Allow this machine's own network addresses so
 * the site can be opened on a real phone on the same Wi-Fi (http://<laptop-ip>:3070). Dev-only.
 */
const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((net) => net && net.family === "IPv4" && !net.internal)
  .map((net) => net!.address);

/**
 * The site's own domain (and its www / bare twin). Server Actions compare the browser's Origin with
 * the Host header; listing the domain keeps forms working on hosts whose proxy rewrites Host.
 */
const siteHosts = (() => {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").host;
    return [host, host.startsWith("www.") ? host.slice(4) : `www.${host}`];
  } catch {
    return [];
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: lanHosts,
  // The embedded dev database loads its WebAssembly build from disk, so it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Database migrations are applied at runtime on first use; ship the SQL files with every function.
  outputFileTracingIncludes: {
    "/**": ["./src/admin/server/db/migrations/**/*"],
  },
  experimental: {
    // Admin forms carry uploaded HTML pages (≤ 2 MB) inside Server Actions.
    serverActions: { bodySizeLimit: "4mb", allowedOrigins: siteHosts },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Uploads served from Vercel Blob when it's connected (otherwise from /media/… on this site).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Hero film frames never change in place (a new cut ships under a new folder), so browsers
      // and the CDN may keep them forever — repeat visits scrub straight from cache.
      {
        source: "/sequences/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;

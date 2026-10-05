import type { NextConfig } from "next";

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
  // The embedded dev database loads its WebAssembly build from disk, so it must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Database migrations are applied at runtime on first use; ship the SQL files with every function.
  outputFileTracingIncludes: {
    "/**": ["./src/admin/server/db/migrations/**/*"],
  },
  experimental: {
    // Admin forms carry uploaded HTML pages (≤ 2 MB) inside Server Actions.
    serverActions: { bodySizeLimit: "4mb" },
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
    ];
  },
};

export default nextConfig;

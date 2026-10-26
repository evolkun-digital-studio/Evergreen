/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  deploymentId: process.env.DEPLOYMENT_VERSION || undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Next 16 caching model: public blog data is cached with `'use cache'` + cacheTag and
  // invalidated on publish via revalidateTag/updateTag.
  cacheComponents: true,
  partialPrefetching: true,
  env: {
    NEXT_PUBLIC_BUILD_YEAR: String(new Date().getFullYear()),
  },
  // Media uploads pass through the proxy (it matches /api); allow up to MEDIA_MAX_UPLOAD_MB.
  experimental: {
    proxyClientMaxBodySize: `${Number(process.env.MEDIA_MAX_UPLOAD_MB || 10) + 1}mb`,
    // VS Code dev tunnels forward the tunnel host in x-forwarded-host but rewrite Origin to
    // localhost:3000, which trips the Server Actions CSRF check. Allow it in dev only.
    ...(process.env.NODE_ENV !== "production" && {
      serverActions: {
        allowedOrigins: ["localhost:3000", "**.devtunnels.ms"],
      },
    }),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "ik.imagekit.io" }],
  },
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
      ...(process.env.NODE_ENV === "production"
        ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
        : []),
    ];
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;

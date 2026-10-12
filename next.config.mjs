/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "ik.imagekit.io" }],
  },
};

export default nextConfig;

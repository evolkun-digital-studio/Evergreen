import { cacheLife, cacheTag } from "next/cache";
import { getSiteSettings } from "@/lib/data/settings";
import { finalizeRobots } from "@/lib/seo/robots";
import { TAGS } from "@/lib/cache-tags";

// Served from Site Settings (SEO Tools → Robots.txt); the sitemap line is always appended.
async function robots() {
  "use cache";
  cacheTag(TAGS.settings);
  cacheLife("max");
  return finalizeRobots((await getSiteSettings()).robotsTxt);
}

export async function GET() {
  return new Response(await robots(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

import { cacheLife, cacheTag } from "next/cache";
import { listIndexablePosts } from "@/lib/data/blog";
import { getSiteSettings } from "@/lib/data/settings";
import { SITE_URL } from "@/lib/cms/constants";
import { TAGS } from "@/lib/cache-tags";

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

async function buildFeed(): Promise<string> {
  "use cache";
  cacheTag(TAGS.posts, TAGS.settings);
  cacheLife("max");
  const [posts, settings] = await Promise.all([listIndexablePosts(30), getSiteSettings()]);
  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      const image = p.image?.variants.original?.find((v) => v.width >= 960) ?? p.image?.variants.original?.at(-1);
      return `    <item>
      <title>${xml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${xml(p.authorName)}</dc:creator>
${p.category ? `      <category>${xml(p.category.name)}</category>\n` : ""}${p.tags.map((t) => `      <category>${xml(t)}</category>\n`).join("")}      <description>${xml(p.excerpt)}</description>
${image ? `      <media:content url="${xml(image.url.startsWith("/") ? SITE_URL + image.url : image.url)}" medium="image" width="${image.width}" />\n` : ""}    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${xml(`${settings.siteTitle} Blog`)}</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>${xml(settings.tagline)}</description>
    <language>en-IN</language>
${posts[0] ? `    <lastBuildDate>${new Date(posts[0].modifiedAt).toUTCString()}</lastBuildDate>\n` : ""}${items}
  </channel>
</rss>
`;
}

export async function GET() {
  return new Response(await buildFeed(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

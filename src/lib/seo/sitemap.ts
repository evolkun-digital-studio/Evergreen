import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { SITE_URL } from "@/lib/cms/constants";
import { TAGS } from "@/lib/cache-tags";
import { listArchiveSlugs, listIndexablePosts } from "@/lib/data/blog";
import { absoluteUrl } from "@/lib/seo/metadata";
import { services } from "@/content/services";
import { servicePhotos } from "@/content/images";

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

type Entry = { loc: string; lastmod?: string; images?: { loc: string; title?: string; caption?: string }[] };

function urlset(entries: Entry[]): string {
  const body = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${xml(e.loc)}</loc>\n${e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : ""}${(e.images ?? [])
          .map(
            (img) =>
              `    <image:image>\n      <image:loc>${xml(img.loc)}</image:loc>\n${img.title ? `      <image:title>${xml(img.title)}</image:title>\n` : ""}${
                img.caption ? `      <image:caption>${xml(img.caption)}</image:caption>\n` : ""
              }    </image:image>\n`,
          )
          .join("")}  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`;
}

const SITEMAPS = ["pages", "posts", "categories"] as const;

/** Last content change to the static pages (src/content/*). Bump it when their copy changes. */
export const STATIC_LASTMOD = "2026-10-10";

const STATIC_PAGES = [
  "/about",
  "/services",
  "/process",
  "/certifications",
  "/sustainability",
  "/epr-calculator",
  "/group-companies",
  "/contact",
  "/privacy-policy",
];
type SitemapName = (typeof SITEMAPS)[number];

export async function buildSitemapIndex(): Promise<string> {
  "use cache";
  cacheTag(TAGS.sitemap, TAGS.posts);
  cacheLife("max");
  const posts = await listIndexablePosts();
  const latest = posts.reduce((max, p) => (p.modifiedAt > max ? p.modifiedAt : max), STATIC_LASTMOD);
  const items = SITEMAPS.map(
    (name) => `  <sitemap>\n    <loc>${SITE_URL}/sitemaps/${name}.xml</loc>\n${latest ? `    <lastmod>${latest}</lastmod>\n` : ""}  </sitemap>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

export async function buildSitemap(name: SitemapName): Promise<string> {
  "use cache";
  cacheTag(TAGS.sitemap, TAGS.posts, TAGS.categories, TAGS.tags, TAGS.authors);
  cacheLife("max");
  if (name === "posts") {
    const posts = await listIndexablePosts();
    return urlset(
      posts.map((p) => {
        const img = p.image?.variants.original?.length ? p.image.variants.original.at(-1)!.url : p.image?.url;
        return {
          loc: `${SITE_URL}/blog/${p.slug}`,
          lastmod: p.modifiedAt,
          images: img ? [{ loc: absoluteUrl(img), title: p.imageAlt || p.title }] : [],
        };
      }),
    );
  }
  const [posts, archives] = await Promise.all([listIndexablePosts(1), listArchiveSlugs()]);
  if (name === "pages") {
    return urlset([
      { loc: `${SITE_URL}/`, lastmod: STATIC_LASTMOD },
      ...STATIC_PAGES.map((p) => ({ loc: `${SITE_URL}${p}`, lastmod: STATIC_LASTMOD })),
      ...services.map((s) => {
        const photo = servicePhotos[s.slug];
        return {
          loc: `${SITE_URL}/services/${s.slug}`,
          lastmod: STATIC_LASTMOD,
          images: photo ? [{ loc: absoluteUrl(photo.src.src), title: photo.alt }] : [],
        };
      }),
      { loc: `${SITE_URL}/blog`, lastmod: posts[0]?.modifiedAt },
      ...archives.authors.map((a) => ({ loc: `${SITE_URL}/blog/author/${a.slug}`, lastmod: a.lastmod })),
    ]);
  }
  return urlset([
    ...archives.categories.map((c) => ({ loc: `${SITE_URL}/blog/category/${c.slug}`, lastmod: c.lastmod })),
    ...archives.tags.map((t) => ({ loc: `${SITE_URL}/blog/tag/${t.slug}`, lastmod: t.lastmod })),
  ]);
}

export const xmlHeaders = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" };

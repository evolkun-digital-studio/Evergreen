import type { Metadata } from "next";
import { SITE_URL } from "@/lib/cms/constants";
import type { SiteSettingsData } from "@/lib/cms/defaults";
import type { PublicPost, PublicTerm } from "@/lib/data/blog";
import type { MediaItem } from "@/lib/media/types";

export const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

function applyTitleTemplate(template: string, title: string): string {
  return template.includes("%s") ? template.replace("%s", title) : `${title} | ${template}`;
}

/** Social images need JPEG/PNG for the widest support; picks the ~1200px original-format variant. */
export function socialImage(media: MediaItem | null | undefined): { url: string; width: number; height: number } | null {
  if (!media || media.mimeType === "image/svg+xml") return null;
  const list = media.variants.original?.length ? media.variants.original : media.variants.webp;
  const best = list?.length ? ([...list].sort((a, b) => Math.abs(a.width - 1200) - Math.abs(b.width - 1200))[0] ?? null) : null;
  if (best) return { url: absoluteUrl(best.url), width: best.width, height: Math.round((best.width / media.width) * media.height) || 630 };
  return { url: absoluteUrl(media.url), width: media.width, height: media.height };
}

export const postUrl = (slug: string) => `${SITE_URL}/blog/${slug}`;

/** OG → featured → site default → generated card. */
export function postOgImage(post: PublicPost, settings: SiteSettingsData) {
  return (
    socialImage(post.seo.ogImage) ??
    socialImage(post.image) ??
    (settings.defaultOgImageUrl ? { url: absoluteUrl(settings.defaultOgImageUrl), width: 1200, height: 630 } : null) ?? {
      url: `${SITE_URL}/og/blog/${post.slug}`,
      width: 1200,
      height: 630,
    }
  );
}

export function postMetadata(post: PublicPost, settings: SiteSettingsData): Metadata {
  const url = postUrl(post.slug);
  const title = post.seo.seoTitle || post.title;
  const description = post.seo.metaDescription || post.excerpt || post.ai.aiSummary;
  const ogTitle = post.seo.ogTitle || title;
  const ogDescription = post.seo.ogDescription || description;
  const image = postOgImage(post, settings);
  const nameTags = Object.fromEntries(post.seo.customMetaTags.filter((t) => t.attr === "name").map((t) => [t.key, t.content]));

  return {
    title: { absolute: applyTitleTemplate(settings.titleTemplate, title) },
    description,
    keywords: [post.seo.focusKeyword, ...post.seo.secondaryKeywords].filter(Boolean),
    authors: [{ name: post.author.name, url: `${SITE_URL}/blog/author/${post.author.slug}` }],
    alternates: {
      canonical: post.seo.canonicalUrl || url,
      // Ready for hreflang once translations exist.
      languages: { [post.ai.targetLanguage || "en-IN"]: url },
      types: { "application/rss+xml": `${SITE_URL}/blog/feed.xml` },
    },
    robots: {
      index: post.seo.robotsIndex,
      follow: post.seo.robotsFollow,
      googleBot: { index: post.seo.robotsIndex, follow: post.seo.robotsFollow, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    openGraph: {
      type: "article",
      url,
      siteName: settings.siteTitle,
      locale: (post.ai.targetLanguage || "en-IN").replace("-", "_"),
      title: ogTitle,
      description: ogDescription,
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      authors: [`${SITE_URL}/blog/author/${post.author.slug}`],
      section: post.category?.name,
      tags: post.tags.map((t) => t.name),
      images: [{ url: image.url, width: image.width, height: image.height, alt: post.imageAlt || ogTitle }],
    },
    twitter: {
      card: post.seo.twitterCard,
      title: post.seo.twitterTitle || ogTitle,
      description: post.seo.twitterDescription || ogDescription,
      images: [image.url],
    },
    other: nameTags,
  };
}

export function listingMetadata(opts: {
  settings: SiteSettingsData;
  title: string;
  description: string;
  path: string;
  page: number;
  image?: MediaItem | null;
}): Metadata {
  const { settings, path, page } = opts;
  const url = `${SITE_URL}${page > 1 ? `${path}/page/${page}` : path}`;
  const title = page > 1 ? `${opts.title} – Page ${page}` : opts.title;
  const image = socialImage(opts.image) ?? (settings.defaultOgImageUrl ? { url: absoluteUrl(settings.defaultOgImageUrl), width: 1200, height: 630 } : null);
  return {
    title: { absolute: applyTitleTemplate(settings.titleTemplate, title) },
    description: opts.description,
    alternates: { canonical: url, types: { "application/rss+xml": `${SITE_URL}/blog/feed.xml` } },
    robots: { index: settings.defaultRobotsIndex, follow: true },
    openGraph: { type: "website", url, siteName: settings.siteTitle, title, description: opts.description, ...(image ? { images: [image] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description: opts.description },
  };
}

export const termDescription = (term: PublicTerm, fallback: string) => term.metaDescription || term.description || fallback;

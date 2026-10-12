import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/blog/ArticleView";
import { getAdjacentPosts, getPublishedPost, getRelatedPosts, listPublishedSlugs } from "@/lib/data/blog";
import { getSiteSettings } from "@/lib/data/settings";
import { postMetadata } from "@/lib/seo/metadata";
import { buildSchema } from "@/lib/seo/schema";
import { serializeJsonLd } from "@/lib/seo/jsonld";

// Pre-render recent posts at build time; any other slug renders on first request and is cached
// until a publish/update expires its tags. Cache Components needs at least one param here.
export async function generateStaticParams() {
  const slugs = await listPublishedSlugs();
  return slugs.length ? slugs.slice(0, 200).map((slug) => ({ slug })) : [{ slug: "__no-posts-yet__" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getPublishedPost(slug), getSiteSettings()]);
  if (!post) return { title: "Article not found", robots: { index: false } };
  return postMetadata(post, settings);
}

export default async function ArticlePage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const [related, adjacent, settings] = await Promise.all([
    getRelatedPosts(post.id, post.category?.slug ?? null, post.tags.map((t) => t.slug)),
    getAdjacentPosts(post.publishedAt),
    getSiteSettings(),
  ]);

  return (
    <>
      {/* Property-based custom meta tags (og:*, article:*) — React hoists <meta> into <head>. */}
      {post.seo.customMetaTags
        .filter((t) => t.attr === "property")
        .map((t) => (
          <meta key={t.key} property={t.key} content={t.content} />
        ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildSchema(post, settings)) }} />
      <ArticleView post={post} related={related} adjacent={adjacent} />
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAuthorBySlug,
  getCategoryBySlug,
  getTagBySlug,
  listArchiveSlugs,
  listCategoriesWithPosts,
  listPublishedPosts,
} from "@/lib/data/blog";
import { getSiteSettings } from "@/lib/data/settings";
import { listingMetadata, termDescription } from "@/lib/seo/metadata";
import { buildListingSchema } from "@/lib/seo/schema";
import { serializeJsonLd } from "@/lib/seo/jsonld";
import type { PostCard, PublicAuthor } from "@/lib/data/blog";
import type { SiteSettingsData } from "@/lib/cms/defaults";

function listingJsonLd(
  settings: SiteSettingsData,
  base: string,
  page: number,
  name: string,
  description: string,
  crumbs: { name: string; path: string }[],
  posts: PostCard[],
  author?: PublicAuthor,
) {
  const path = page > 1 ? `${base}/page/${page}` : base;
  return serializeJsonLd(buildListingSchema({ settings, path, name, description, crumbs, posts, author }));
}
import { AuthorBox } from "./ArticleParts";
import { CategoryChips, ListingShell } from "./Listing";

// Page bodies + metadata shared by page 1 (/x) and page N (/x/page/N) of every listing.

const BLOG_DESCRIPTION =
  "Articles from Evergreen on EPR compliance, CPCB rules, and e-waste and plastic recycling, written for producers, importers and brand owners in India.";

export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 2 ? n : NaN;
}

/** Placeholder params satisfy Cache Components' "at least one param" rule; they 404. */
export const PLACEHOLDER_PAGE = [{ page: "2" }];

// --- /blog ----------------------------------------------------------------------------------

export async function blogIndexMetadata(page: number): Promise<Metadata> {
  const settings = await getSiteSettings();
  return listingMetadata({ settings, title: "EPR, E-Waste and Plastic Compliance Articles", description: BLOG_DESCRIPTION, path: "/blog", page });
}

export async function BlogIndex({ page }: { page: number }) {
  const settings = await getSiteSettings();
  const perPage = settings.postsPerPage;
  const { posts, pages } = await listPublishedPosts({}, page, perPage);
  if (page > 1 && page > pages) notFound();
  const categories = await listCategoriesWithPosts();
  // Page 1 promotes the newest post to a featured card above the grid.
  const featured = page === 1 ? (posts[0] ?? null) : null;
  const rest = page === 1 ? posts.slice(1) : posts;
  return (
    <ListingShell
      crumbs={[{ name: "Home", href: "/" }, { name: "Blog" }]}
      eyebrow="Evergreen Insights"
      title={page > 1 ? `Articles – page ${page}` : "Articles on EPR and waste compliance"}
      description={page === 1 ? BLOG_DESCRIPTION : undefined}
      chips={<CategoryChips categories={categories} />}
      featured={featured}
      posts={rest}
      page={page}
      pages={pages}
      base="/blog"
      jsonLd={listingJsonLd(settings, "/blog", page, "Evergreen Insights", BLOG_DESCRIPTION, [{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }], posts)}
    />
  );
}

// --- /blog/category/[slug] ---------------------------------------------------------------------

export async function categoryMetadata(slug: string, page: number): Promise<Metadata> {
  const [settings, term] = await Promise.all([getSiteSettings(), getCategoryBySlug(slug)]);
  if (!term) return { title: "Category not found", robots: { index: false } };
  return listingMetadata({
    settings,
    title: term.seoTitle || `${term.name} Articles`,
    description: termDescription(term, `Articles about ${term.name} from Evergreen Insights.`),
    path: `/blog/category/${slug}`,
    page,
    image: term.ogImage,
  });
}

export async function CategoryArchive({ slug, page }: { slug: string; page: number }) {
  const [settings, term, categories] = await Promise.all([getSiteSettings(), getCategoryBySlug(slug), listCategoriesWithPosts()]);
  if (!term) notFound();
  const { posts, pages } = await listPublishedPosts({ categoryId: term.id }, page, settings.postsPerPage);
  if (page > pages) notFound();
  return (
    <ListingShell
      crumbs={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name: term.name }]}
      eyebrow="Category"
      title={term.name}
      description={term.description}
      chips={<CategoryChips categories={categories} active={slug} />}
      posts={posts}
      page={page}
      pages={pages}
      base={`/blog/category/${slug}`}
      jsonLd={listingJsonLd(settings, `/blog/category/${slug}`, page, term.name, term.description, [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: term.name, path: `/blog/category/${slug}` },
      ], posts)}
    />
  );
}

// --- /blog/tag/[slug] --------------------------------------------------------------------------

export async function tagMetadata(slug: string, page: number): Promise<Metadata> {
  const [settings, term] = await Promise.all([getSiteSettings(), getTagBySlug(slug)]);
  if (!term) return { title: "Tag not found", robots: { index: false } };
  return listingMetadata({
    settings,
    title: term.seoTitle || `${term.name}: Articles & Guides`,
    description: termDescription(term, `Articles tagged ${term.name} on Evergreen Insights.`),
    path: `/blog/tag/${slug}`,
    page,
  });
}

export async function TagArchive({ slug, page }: { slug: string; page: number }) {
  const [settings, term] = await Promise.all([getSiteSettings(), getTagBySlug(slug)]);
  if (!term) notFound();
  const { posts, pages } = await listPublishedPosts({ tagId: term.id }, page, settings.postsPerPage);
  if (page > pages) notFound();
  return (
    <ListingShell
      crumbs={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name: `#${term.name}` }]}
      eyebrow="Tag"
      title={`#${term.name}`}
      description={term.description}
      posts={posts}
      page={page}
      pages={pages}
      base={`/blog/tag/${slug}`}
      jsonLd={listingJsonLd(settings, `/blog/tag/${slug}`, page, `#${term.name}`, term.description, [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: term.name, path: `/blog/tag/${slug}` },
      ], posts)}
    />
  );
}

// --- /blog/author/[slug] -----------------------------------------------------------------------

export async function authorMetadata(slug: string, page: number): Promise<Metadata> {
  const [settings, author] = await Promise.all([getSiteSettings(), getAuthorBySlug(slug)]);
  if (!author) return { title: "Author not found", robots: { index: false } };
  return {
    ...listingMetadata({
      settings,
      title: `${author.name}${author.jobTitle ? `, ${author.jobTitle}` : ""}`,
      description: author.bio.slice(0, 155) || `Articles by ${author.name} on Evergreen Insights.`,
      path: `/blog/author/${slug}`,
      page,
      image: author.avatar,
    }),
  };
}

export async function AuthorArchive({ slug, page }: { slug: string; page: number }) {
  const [settings, author] = await Promise.all([getSiteSettings(), getAuthorBySlug(slug)]);
  if (!author) notFound();
  const { posts, pages } = await listPublishedPosts({ authorId: author.id }, page, settings.postsPerPage);
  if (page > pages) notFound();
  return (
    <ListingShell
      crumbs={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name: author.name }]}
      eyebrow="Author"
      title={author.name}
      aside={<AuthorBox author={author} label={author.jobTitle || "Author"} />}
      posts={posts}
      page={page}
      pages={pages}
      base={`/blog/author/${slug}`}
      jsonLd={listingJsonLd(settings, `/blog/author/${slug}`, page, author.name, author.bio, [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: author.name, path: `/blog/author/${slug}` },
      ], posts, author)}
    />
  );
}

// --- static params -------------------------------------------------------------------------------

export async function archiveParams(kind: "categories" | "tags" | "authors") {
  const slugs = (await listArchiveSlugs())[kind].map((s) => ({ slug: s.slug }));
  return slugs.length ? slugs : [{ slug: "__none__" }];
}

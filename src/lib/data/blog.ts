import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import mongoose from "mongoose";
import { connectDB, isDbConfigured } from "@/lib/db";
import { Author, Category, Media, Post, Tag, type PostDoc } from "@/lib/models";
import { TAGS } from "@/lib/cache-tags";
import { extractHeadings, buildTocTree, type TocItem } from "@/lib/content/toc";
import { NODES, type PMNode } from "@/lib/content/types";
import { toMediaItem } from "@/lib/data/media";
import type { MediaItem } from "@/lib/media/types";
import { defined } from "@/lib/utils";
import { logServerError } from "@/lib/log";

// Public, cached readers. Every function is `use cache` + tagged so publishing expires exactly
// what changed. Values are plain JSON (ids/dates as strings): cached results must serialise.

const LIVE = { status: "PUBLISHED", deletedAt: null } as const;

export type PublicAuthor = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  jobTitle: string;
  credentials: string;
  expertise: string[];
  sameAs: string[];
  avatar: MediaItem | null;
};
export type PublicTerm = { id: string; name: string; slug: string; description: string; seoTitle: string; metaDescription: string; ogImage: MediaItem | null };

export type PostCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  modifiedAt: string;
  readingTimeMinutes: number;
  category: { name: string; slug: string } | null;
  authorName: string;
  image: MediaItem | null;
  imageAlt: string;
  robotsIndex: boolean;
};

export type PublicPost = PostCard & {
  contentHtml: string;
  contentText: string;
  wordCount: number;
  lastReviewedAt: string | null;
  toc: TocItem[];
  headingCount: number;
  blocks: { faq: boolean; takeaways: boolean; toc: boolean };
  imageCaption: string;
  imageTitle: string;
  tags: { name: string; slug: string }[];
  author: PublicAuthor;
  reviewer: PublicAuthor | null;
  seo: {
    seoTitle: string;
    metaDescription: string;
    focusKeyword: string;
    secondaryKeywords: string[];
    canonicalUrl: string;
    robotsIndex: boolean;
    robotsFollow: boolean;
    ogTitle: string;
    ogDescription: string;
    ogImage: MediaItem | null;
    twitterCard: "summary" | "summary_large_image";
    twitterTitle: string;
    twitterDescription: string;
    breadcrumbEnabled: boolean;
    customMetaTags: { attr: "name" | "property"; key: string; content: string }[];
  };
  ai: {
    aiSummary: string;
    keyTakeaways: string[];
    faqs: { question: string; answer: string }[];
    mainEntity: { name: string; type: string; sameAs: string } | null;
    about: { name: string; type: string; sameAs: string }[];
    mentions: { name: string; type: string; sameAs: string }[];
    targetLanguage: string;
    contentType: string;
  };
  schemaExtras: {
    howToSteps: { name: string; text: string; image: MediaItem | null }[];
    video: { url: string; embedUrl: string; name: string; description: string; thumbnail: MediaItem | null; uploadDate: string | null; duration: string } | null;
    review: { itemName: string; itemType: string; ratingValue: number | null; bestRating: number; pros: string[]; cons: string[] } | null;
    product: { name: string; brand: string; sku: string; priceRange: string } | null;
    speakableEnabled: boolean;
  };
  contentImages: { src: string; alt: string; caption: string; width: number; height: number }[];
  contentVideos: { youtubeId: string; title: string }[];
};

async function safe<T>(fallback: T, fn: () => Promise<T>): Promise<T> {
  if (!isDbConfigured()) {
    cacheLife("hours");
    return fallback;
  }
  try {
    const value = await fn();
    cacheLife("max");
    return value;
  } catch (error) {
    logServerError("[blog data]", error);
    cacheLife("minutes");
    return fallback;
  }
}

async function mediaMap(ids: (mongoose.Types.ObjectId | string | null | undefined)[]) {
  const valid = [...new Set(ids.filter(defined).map(String))];
  if (!valid.length) return new Map<string, MediaItem>();
  const docs = await Media.find({ _id: { $in: valid }, deletedAt: null }).lean();
  return new Map(docs.map((d) => [d._id.toString(), toMediaItem(d)]));
}

function toAuthor(a: Record<string, unknown> & { _id: mongoose.Types.ObjectId }, media: Map<string, MediaItem>): PublicAuthor {
  return {
    id: a._id.toString(),
    name: String(a.name ?? ""),
    slug: String(a.slug ?? ""),
    bio: String(a.bio ?? ""),
    jobTitle: String(a.jobTitle ?? ""),
    credentials: String(a.credentials ?? ""),
    expertise: (a.expertise as string[]) ?? [],
    sameAs: (a.sameAs as string[]) ?? [],
    avatar: a.avatarId ? (media.get(String(a.avatarId)) ?? null) : null,
  };
}

function toTerm(t: Record<string, unknown> & { _id: mongoose.Types.ObjectId }, media?: Map<string, MediaItem>): PublicTerm {
  return {
    id: t._id.toString(),
    name: String(t.name ?? ""),
    slug: String(t.slug ?? ""),
    description: String(t.description ?? ""),
    seoTitle: String(t.seoTitle ?? ""),
    metaDescription: String(t.metaDescription ?? ""),
    ogImage: t.ogImageId && media ? (media.get(String(t.ogImageId)) ?? null) : null,
  };
}

const CARD_FIELDS = {
  slug: 1,
  title: 1,
  excerpt: 1,
  publishedAt: 1,
  modifiedAt: 1,
  readingTimeMinutes: 1,
  categoryId: 1,
  authorId: 1,
  featuredImageId: 1,
  featuredImageAlt: 1,
  "seo.robotsIndex": 1,
} as const;

type CardDoc = {
  _id: mongoose.Types.ObjectId;
  slug: string;
  title: string;
  excerpt?: string;
  publishedAt?: Date | null;
  modifiedAt?: Date | null;
  readingTimeMinutes?: number;
  categoryId?: mongoose.Types.ObjectId | null;
  authorId: mongoose.Types.ObjectId;
  featuredImageId?: mongoose.Types.ObjectId | null;
  featuredImageAlt?: string;
  seo?: { robotsIndex?: boolean };
};

async function toCards(docs: CardDoc[]): Promise<PostCard[]> {
  const [cats, authors, media] = await Promise.all([
    Category.find({ _id: { $in: docs.map((d) => d.categoryId).filter(defined) } }).select({ name: 1, slug: 1 }).lean(),
    Author.find({ _id: { $in: docs.map((d) => d.authorId) } }).select({ name: 1 }).lean(),
    mediaMap(docs.map((d) => d.featuredImageId)),
  ]);
  const cat = new Map(cats.map((c) => [c._id.toString(), { name: c.name, slug: c.slug }]));
  const author = new Map(authors.map((a) => [a._id.toString(), a.name]));
  return docs.map((d) => {
    const published = (d.publishedAt ?? new Date(0)).toISOString();
    return {
      id: d._id.toString(),
      slug: d.slug,
      title: d.title,
      excerpt: d.excerpt ?? "",
      publishedAt: published,
      modifiedAt: d.modifiedAt ? d.modifiedAt.toISOString() : published,
      readingTimeMinutes: d.readingTimeMinutes ?? 0,
      category: d.categoryId ? (cat.get(d.categoryId.toString()) ?? null) : null,
      authorName: author.get(d.authorId.toString()) ?? "",
      image: d.featuredImageId ? (media.get(d.featuredImageId.toString()) ?? null) : null,
      imageAlt: d.featuredImageAlt ?? "",
      robotsIndex: d.seo?.robotsIndex ?? true,
    };
  });
}

// ---------------------------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------------------------

type ListFilter = { categoryId?: string; tagId?: string; authorId?: string };

export async function listPublishedPosts(filter: ListFilter, page: number, perPage: number): Promise<{ posts: PostCard[]; total: number; pages: number }> {
  "use cache";
  cacheTag(TAGS.posts);
  return safe({ posts: [], total: 0, pages: 1 }, async () => {
    await connectDB();
    const q: Record<string, unknown> = { ...LIVE };
    if (filter.categoryId) q.categoryId = new mongoose.Types.ObjectId(filter.categoryId);
    if (filter.tagId) q.tags = new mongoose.Types.ObjectId(filter.tagId);
    if (filter.authorId) q.authorId = new mongoose.Types.ObjectId(filter.authorId);
    const [docs, total] = await Promise.all([
      Post.find(q)
        .sort({ publishedAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .select(CARD_FIELDS)
        .lean<CardDoc[]>(),
      Post.countDocuments(q),
    ]);
    return { posts: await toCards(docs), total, pages: Math.max(1, Math.ceil(total / perPage)) };
  });
}

/** Indexable posts for the sitemap, RSS and llms.txt (noindex posts are excluded). */
export async function listIndexablePosts(limit = 50_000): Promise<(PostCard & { tags: string[]; summary: string })[]> {
  "use cache";
  cacheTag(TAGS.posts, TAGS.sitemap);
  return safe([], async () => {
    await connectDB();
    const docs = await Post.find({ ...LIVE, "seo.robotsIndex": { $ne: false }, "seo.canonicalUrl": { $in: ["", null] } })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select({ ...CARD_FIELDS, tags: 1, "ai.aiSummary": 1 })
      .lean<(CardDoc & { tags?: mongoose.Types.ObjectId[]; ai?: { aiSummary?: string } })[]>();
    const cards = await toCards(docs);
    const tags = await Tag.find({ _id: { $in: docs.flatMap((d) => d.tags ?? []) } }).select({ name: 1 }).lean();
    const tagName = new Map(tags.map((t) => [t._id.toString(), t.name]));
    return cards.map((c, i) => ({
      ...c,
      tags: (docs[i].tags ?? []).map((t) => tagName.get(t.toString())).filter(defined),
      summary: docs[i].ai?.aiSummary || c.excerpt,
    }));
  });
}

export async function listPublishedSlugs(): Promise<string[]> {
  "use cache";
  cacheTag(TAGS.posts);
  return safe([], async () => {
    await connectDB();
    const docs = await Post.find(LIVE).sort({ publishedAt: -1 }).limit(1000).select({ slug: 1 }).lean();
    return docs.map((d) => d.slug);
  });
}

// ---------------------------------------------------------------------------------------------
// Single post
// ---------------------------------------------------------------------------------------------

function hasNode(node: PMNode, type: string): boolean {
  return node.type === type || Boolean(node.content?.some((c) => hasNode(c, type)));
}

function collectContentMedia(node: PMNode, images: PublicPost["contentImages"], videos: PublicPost["contentVideos"]) {
  if (node.type === "image" && node.attrs?.src) {
    images.push({
      src: String(node.attrs.src),
      alt: String(node.attrs.alt ?? ""),
      caption: String(node.attrs.caption ?? ""),
      width: Number(node.attrs.width ?? 0),
      height: Number(node.attrs.height ?? 0),
    });
  }
  if (node.type === NODES.videoEmbed && node.attrs?.url) {
    const m = String(node.attrs.url).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    if (m) videos.push({ youtubeId: m[1], title: String(node.attrs.title ?? "") });
  }
  node.content?.forEach((c) => collectContentMedia(c, images, videos));
}

export async function getPublishedPost(slug: string): Promise<PublicPost | null> {
  "use cache";
  cacheTag(TAGS.post(slug), TAGS.posts);
  return safe(null, async () => {
    await connectDB();
    const p = await Post.findOne({ ...LIVE, slug }).lean();
    return p ? toPublicPost(p) : null;
  });
}

/** Shapes a post document for rendering (shared by the cached reader and draft preview). */
export async function toPublicPost(p: PostDoc): Promise<PublicPost> {
  const [cat, tags, people] = await Promise.all([
    p.categoryId ? Category.findById(p.categoryId).select({ name: 1, slug: 1 }).lean() : null,
    Tag.find({ _id: { $in: p.tags ?? [] } }).select({ name: 1, slug: 1 }).lean(),
    Author.find({ _id: { $in: [p.authorId, p.reviewerId].filter(defined) } }).lean(),
  ]);
  const x = p.schemaExtras;
  const media = await mediaMap([
    p.featuredImageId,
    p.seo?.ogImageId,
    x?.video?.thumbnailId,
    ...(x?.howToSteps ?? []).map((s) => s.imageId),
    ...people.map((a) => a.avatarId),
  ]);
  const person = new Map(people.map((a) => [a._id.toString(), toAuthor(a as never, media)]));
  const content = (p.content ?? { type: "doc" }) as PMNode;
  const headings = extractHeadings(content);
  const contentImages: PublicPost["contentImages"] = [];
  const contentVideos: PublicPost["contentVideos"] = [];
  collectContentMedia(content, contentImages, contentVideos);
  const published = (p.publishedAt ?? p.createdAt).toISOString();
  const m = (id: unknown) => (id ? (media.get(String(id)) ?? null) : null);
  const entity = (e: { name?: string; type?: string; sameAs?: string } | null | undefined) =>
    e?.name ? { name: e.name, type: e.type ?? "Thing", sameAs: e.sameAs ?? "" } : null;

  return {
    id: p._id.toString(),
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? "",
    publishedAt: published,
    modifiedAt: p.modifiedAt ? p.modifiedAt.toISOString() : published,
    lastReviewedAt: p.lastReviewedAt ? p.lastReviewedAt.toISOString() : null,
    readingTimeMinutes: p.readingTimeMinutes ?? 0,
    wordCount: p.wordCount ?? 0,
    category: cat ? { name: cat.name, slug: cat.slug } : null,
    authorName: person.get(p.authorId.toString())?.name ?? "",
    image: m(p.featuredImageId),
    imageAlt: p.featuredImageAlt ?? "",
    imageCaption: p.featuredImageCaption ?? "",
    imageTitle: p.featuredImageTitle ?? "",
    robotsIndex: p.seo?.robotsIndex ?? true,
    contentHtml: p.contentHtml ?? "",
    contentText: p.contentText ?? "",
    toc: buildTocTree(headings),
    headingCount: headings.length,
    blocks: { faq: hasNode(content, NODES.faq), takeaways: hasNode(content, NODES.keyTakeaways), toc: hasNode(content, NODES.toc) },
    tags: tags.map((t) => ({ name: t.name, slug: t.slug })),
    author: person.get(p.authorId.toString())!,
    reviewer: p.reviewerId ? (person.get(p.reviewerId.toString()) ?? null) : null,
    seo: {
      seoTitle: p.seo?.seoTitle ?? "",
      metaDescription: p.seo?.metaDescription ?? "",
      focusKeyword: p.seo?.focusKeyword ?? "",
      secondaryKeywords: p.seo?.secondaryKeywords ?? [],
      canonicalUrl: p.seo?.canonicalUrl ?? "",
      robotsIndex: p.seo?.robotsIndex ?? true,
      robotsFollow: p.seo?.robotsFollow ?? true,
      ogTitle: p.seo?.ogTitle ?? "",
      ogDescription: p.seo?.ogDescription ?? "",
      ogImage: m(p.seo?.ogImageId),
      twitterCard: (p.seo?.twitterCard ?? "summary_large_image") as "summary_large_image",
      twitterTitle: p.seo?.twitterTitle ?? "",
      twitterDescription: p.seo?.twitterDescription ?? "",
      breadcrumbEnabled: p.seo?.breadcrumbEnabled ?? true,
      customMetaTags: (p.seo?.customMetaTags ?? []).map((t) => ({ attr: t.attr as "name", key: t.key, content: t.content })),
    },
    ai: {
      aiSummary: p.ai?.aiSummary ?? "",
      keyTakeaways: p.ai?.keyTakeaways ?? [],
      faqs: (p.ai?.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })),
      mainEntity: entity(p.ai?.mainEntity),
      about: (p.ai?.about ?? []).map(entity).filter(defined),
      mentions: (p.ai?.mentions ?? []).map(entity).filter(defined),
      targetLanguage: p.ai?.targetLanguage ?? "en-IN",
      contentType: p.ai?.contentType ?? "Guide",
    },
    schemaExtras: {
      howToSteps: (x?.howToSteps ?? []).map((s) => ({ name: s.name, text: s.text, image: m(s.imageId) })),
      video: x?.video?.url
        ? {
            url: x.video.url,
            embedUrl: x.video.embedUrl ?? "",
            name: x.video.name ?? "",
            description: x.video.description ?? "",
            thumbnail: m(x.video.thumbnailId),
            uploadDate: x.video.uploadDate ? x.video.uploadDate.toISOString() : null,
            duration: x.video.duration ?? "",
          }
        : null,
      review: x?.review?.itemName
        ? {
            itemName: x.review.itemName,
            itemType: x.review.itemType ?? "Product",
            ratingValue: x.review.ratingValue ?? null,
            bestRating: x.review.bestRating ?? 5,
            pros: x.review.pros ?? [],
            cons: x.review.cons ?? [],
          }
        : null,
      product: x?.product?.name ? { name: x.product.name, brand: x.product.brand ?? "", sku: x.product.sku ?? "", priceRange: x.product.priceRange ?? "" } : null,
      speakableEnabled: x?.speakableEnabled ?? true,
    },
    contentImages,
    contentVideos,
  };
}

/** Same category first, then shared tags; newest first within each. */
export async function getRelatedPosts(postId: string, categorySlug: string | null, tagSlugs: string[], limit = 3): Promise<PostCard[]> {
  "use cache";
  cacheTag(TAGS.posts);
  return safe([], async () => {
    await connectDB();
    const [cat, tags] = await Promise.all([
      categorySlug ? Category.findOne({ slug: categorySlug }).select({ _id: 1 }).lean() : null,
      Tag.find({ slug: { $in: tagSlugs } }).select({ _id: 1 }).lean(),
    ]);
    const or: Record<string, unknown>[] = [];
    if (cat) or.push({ categoryId: cat._id });
    if (tags.length) or.push({ tags: { $in: tags.map((t) => t._id) } });
    if (!or.length) return [];
    const docs = await Post.aggregate<CardDoc>([
      { $match: { ...LIVE, _id: { $ne: new mongoose.Types.ObjectId(postId) }, $or: or } },
      {
        $addFields: {
          _sameCat: cat ? { $cond: [{ $eq: ["$categoryId", cat._id] }, 1, 0] } : 0,
          _sharedTags: { $size: { $setIntersection: ["$tags", tags.map((t) => t._id)] } },
        },
      },
      { $sort: { _sameCat: -1, _sharedTags: -1, publishedAt: -1 } },
      { $limit: limit },
      { $project: CARD_FIELDS },
    ]);
    return toCards(docs);
  });
}

export async function getAdjacentPosts(publishedAt: string): Promise<{ prev: PostCard | null; next: PostCard | null }> {
  "use cache";
  cacheTag(TAGS.posts);
  return safe({ prev: null, next: null }, async () => {
    await connectDB();
    const at = new Date(publishedAt);
    const [prev, next] = await Promise.all([
      Post.findOne({ ...LIVE, publishedAt: { $lt: at } }).sort({ publishedAt: -1 }).select(CARD_FIELDS).lean<CardDoc>(),
      Post.findOne({ ...LIVE, publishedAt: { $gt: at } }).sort({ publishedAt: 1 }).select(CARD_FIELDS).lean<CardDoc>(),
    ]);
    const cards = await toCards([prev, next].filter(defined));
    return { prev: prev ? cards[0] : null, next: next ? cards[prev ? 1 : 0] : null };
  });
}

// ---------------------------------------------------------------------------------------------
// Taxonomy & authors
// ---------------------------------------------------------------------------------------------

export async function listCategoriesWithPosts(): Promise<(PublicTerm & { count: number })[]> {
  "use cache";
  cacheTag(TAGS.categories, TAGS.posts);
  return safe([], async () => {
    await connectDB();
    const counts = await Post.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
      { $match: { ...LIVE, categoryId: { $ne: null } } },
      { $group: { _id: "$categoryId", n: { $sum: 1 } } },
    ]);
    const count = new Map(counts.map((c) => [c._id.toString(), c.n]));
    const cats = await Category.find({ _id: { $in: counts.map((c) => c._id) } }).sort({ sortOrder: 1, name: 1 }).lean();
    return cats.map((c) => ({ ...toTerm(c as never), count: count.get(c._id.toString()) ?? 0 }));
  });
}

export async function getCategoryBySlug(slug: string): Promise<PublicTerm | null> {
  "use cache";
  cacheTag(TAGS.category(slug), TAGS.categories);
  return safe(null, async () => {
    await connectDB();
    const c = await Category.findOne({ slug }).lean();
    if (!c) return null;
    return toTerm(c as never, await mediaMap([c.ogImageId]));
  });
}

export async function getTagBySlug(slug: string): Promise<PublicTerm | null> {
  "use cache";
  cacheTag(TAGS.tag(slug), TAGS.tags);
  return safe(null, async () => {
    await connectDB();
    const t = await Tag.findOne({ slug }).lean();
    return t ? toTerm(t as never) : null;
  });
}

export async function getAuthorBySlug(slug: string): Promise<PublicAuthor | null> {
  "use cache";
  cacheTag(TAGS.author(slug), TAGS.authors);
  return safe(null, async () => {
    await connectDB();
    const a = await Author.findOne({ slug }).lean();
    if (!a) return null;
    return toAuthor(a as never, await mediaMap([a.avatarId]));
  });
}

/** Slugs of taxonomy / author archives that have at least one live post (sitemaps, static params). */
export async function listArchiveSlugs(): Promise<{ categories: { slug: string; lastmod: string }[]; tags: { slug: string; lastmod: string }[]; authors: { slug: string; lastmod: string }[] }> {
  "use cache";
  cacheTag(TAGS.posts, TAGS.categories, TAGS.tags, TAGS.authors, TAGS.sitemap);
  return safe({ categories: [], tags: [], authors: [] }, async () => {
    await connectDB();
    const group = (key: string, unwind = false) =>
      Post.aggregate<{ _id: mongoose.Types.ObjectId; last: Date }>([
        { $match: { ...LIVE } },
        ...(unwind ? [{ $unwind: `$${key}` }] : []),
        { $group: { _id: `$${key}`, last: { $max: { $ifNull: ["$modifiedAt", "$publishedAt"] } } } },
      ]);
    const [cats, tags, authors] = await Promise.all([group("categoryId"), group("tags", true), group("authorId")]);
    const resolve = async (model: typeof Category | typeof Tag | typeof Author, rows: { _id: mongoose.Types.ObjectId; last: Date }[]) => {
      const docs = await (model as typeof Category).find({ _id: { $in: rows.map((r) => r._id).filter(defined) } }).select({ slug: 1 }).lean();
      const slug = new Map(docs.map((d) => [d._id.toString(), d.slug]));
      return rows.filter((r) => r._id && slug.has(r._id.toString())).map((r) => ({ slug: slug.get(r._id.toString())!, lastmod: new Date(r.last).toISOString() }));
    };
    return {
      categories: await resolve(Category, cats),
      tags: await resolve(Tag, tags),
      authors: await resolve(Author, authors),
    };
  });
}

import "server-only";
import mongoose from "mongoose";
import { connectDB, withTransaction } from "@/lib/db";
import { Author, Category, LinkCheck, Media, Post, PostRevision, Redirect, Tag, type PostDoc } from "@/lib/models";
import { scorePost, scoreSummary } from "@/lib/seo-score";
import { toScoreInput } from "@/lib/seo-score/input";
import { DEFAULT_AI_CONTEXT, REVISION_LIMIT, can } from "@/lib/cms/constants";
import { DEFAULT_SETTINGS } from "@/lib/cms/defaults";
import { renderContent } from "@/lib/content/render";
import { EMPTY_DOC, type PMNode } from "@/lib/content/types";
import { getMediaMap } from "@/lib/data/media";
import { readSiteSettings } from "@/lib/data/settings";
import { slugify, uniqueSlug } from "@/lib/slug";
import { UserFacingError } from "@/lib/errors";
import { defined } from "@/lib/utils";
import { expireTags, postTags } from "@/lib/revalidate";
import { blogUrl, queueIndexing } from "@/lib/indexing/queue";
import type { SessionUser } from "@/lib/auth/session";
import { postSchema, type PostData, type PostInput, type SaveIntent } from "@/lib/validation/post";
import type { EditorPost, EditorPostMeta, SaveResult } from "./editor-types";

type LeanPost = PostDoc;
const oid = (id: string) => new mongoose.Types.ObjectId(id);
const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

// ---------------------------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------------------------

/** Authors may only touch their own drafts; editors and admins may edit anything. */
export function assertCanEdit(user: SessionUser, post: Pick<LeanPost, "status" | "createdById" | "authorId"> | null) {
  if (!post || can.editAnyPost(user.role)) return;
  const own = post.createdById?.toString() === user.id || (user.authorId && post.authorId?.toString() === user.authorId);
  if (!own) throw new UserFacingError("You can only edit your own posts.");
  if (post.status !== "DRAFT") throw new UserFacingError("This post has been published or scheduled; ask an editor to change it.");
}

// ---------------------------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------------------------

function toEditorMeta(p: LeanPost | null): EditorPostMeta {
  return {
    id: p ? p._id.toString() : null,
    status: p?.status ?? "DRAFT",
    publishedAt: iso(p?.publishedAt),
    scheduledFor: iso(p?.scheduledFor),
    modifiedAt: iso(p?.modifiedAt),
    updatedAt: iso(p?.updatedAt),
    publishedSlug: p?.status === "PUBLISHED" ? p.slug : null,
    deletedAt: iso(p?.deletedAt),
  };
}

export async function toEditorPost(p: LeanPost): Promise<EditorPost> {
  const tagDocs = p.tags?.length ? await Tag.find({ _id: { $in: p.tags } }).select({ name: 1 }).lean() : [];
  const tagName = new Map(tagDocs.map((t) => [t._id.toString(), t.name]));
  const s = p.seo ?? {};
  const a = p.ai ?? {};
  const x = p.schemaExtras ?? {};
  const idStr = (v: unknown) => (v ? String(v) : null);
  const entity = (e: { name?: string; type?: string; sameAs?: string } | null | undefined) =>
    e?.name ? { name: e.name, type: (e.type ?? "Thing") as never, sameAs: e.sameAs ?? "" } : null;

  const values: PostInput = {
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? "",
    content: (p.content as PostInput["content"]) ?? EMPTY_DOC,
    featuredImageId: idStr(p.featuredImageId),
    featuredImageAlt: p.featuredImageAlt ?? "",
    featuredImageCaption: p.featuredImageCaption ?? "",
    featuredImageTitle: p.featuredImageTitle ?? "",
    categoryId: idStr(p.categoryId),
    tags: (p.tags ?? []).map((t) => ({ id: t.toString(), name: tagName.get(t.toString()) ?? "" })).filter((t) => t.name),
    authorId: p.authorId.toString(),
    reviewerId: idStr(p.reviewerId),
    publishedAt: iso(p.publishedAt),
    lastReviewedAt: iso(p.lastReviewedAt),
    significantUpdate: false,
    seo: {
      seoTitle: s.seoTitle ?? "",
      metaDescription: s.metaDescription ?? "",
      focusKeyword: s.focusKeyword ?? "",
      secondaryKeywords: s.secondaryKeywords ?? [],
      canonicalUrl: s.canonicalUrl ?? "",
      robotsIndex: s.robotsIndex ?? true,
      robotsFollow: s.robotsFollow ?? true,
      ogTitle: s.ogTitle ?? "",
      ogDescription: s.ogDescription ?? "",
      ogImageId: idStr(s.ogImageId),
      twitterCard: (s.twitterCard ?? "summary_large_image") as "summary_large_image",
      twitterTitle: s.twitterTitle ?? "",
      twitterDescription: s.twitterDescription ?? "",
      breadcrumbEnabled: s.breadcrumbEnabled ?? true,
      customMetaTags: (s.customMetaTags ?? []).map((m) => ({ attr: m.attr as "name", key: m.key, content: m.content })),
    },
    ai: {
      aiSummary: a.aiSummary ?? "",
      keyTakeaways: a.keyTakeaways ?? [],
      faqs: (a.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })),
      mainEntity: entity(a.mainEntity),
      about: (a.about ?? []).map(entity).filter((e) => e !== null),
      mentions: (a.mentions ?? []).map(entity).filter((e) => e !== null),
      targetCountry: a.targetCountry ?? DEFAULT_AI_CONTEXT.targetCountry,
      targetLanguage: a.targetLanguage ?? DEFAULT_AI_CONTEXT.targetLanguage,
      targetAudience: a.targetAudience ?? DEFAULT_AI_CONTEXT.targetAudience,
      contentType: (a.contentType ?? DEFAULT_AI_CONTEXT.contentType) as "Guide",
      contentIntent: (a.contentIntent ?? DEFAULT_AI_CONTEXT.contentIntent) as "Informational",
    },
    schemaExtras: {
      howToSteps: (x.howToSteps ?? []).map((h) => ({ name: h.name, text: h.text, imageId: idStr(h.imageId) })),
      video: x.video
        ? {
            url: x.video.url ?? "",
            embedUrl: x.video.embedUrl ?? "",
            name: x.video.name ?? "",
            description: x.video.description ?? "",
            thumbnailId: idStr(x.video.thumbnailId),
            uploadDate: iso(x.video.uploadDate),
            duration: x.video.duration ?? "",
          }
        : null,
      review: x.review
        ? {
            itemName: x.review.itemName ?? "",
            itemType: x.review.itemType ?? "Product",
            ratingValue: x.review.ratingValue ?? null,
            bestRating: x.review.bestRating ?? 5,
            pros: x.review.pros ?? [],
            cons: x.review.cons ?? [],
          }
        : null,
      product: x.product
        ? { name: x.product.name ?? "", brand: x.product.brand ?? "", sku: x.product.sku ?? "", priceRange: x.product.priceRange ?? "" }
        : null,
      speakableEnabled: x.speakableEnabled ?? true,
    },
  };
  return { meta: toEditorMeta(p), values };
}

/** Defaults for a brand-new post. */
export async function newEditorPost(user: SessionUser): Promise<EditorPost> {
  await connectDB();
  const settings = await readSiteSettings().catch(() => DEFAULT_SETTINGS);
  const authorId = user.authorId ?? (await Author.findOne().sort({ createdAt: 1 }).select({ _id: 1 }).lean())?._id.toString();
  if (!authorId) throw new UserFacingError("Create an author profile before writing posts.");
  return {
    meta: toEditorMeta(null),
    values: {
      title: "",
      slug: "",
      excerpt: "",
      content: EMPTY_DOC,
      featuredImageId: null,
      featuredImageAlt: "",
      featuredImageCaption: "",
      featuredImageTitle: "",
      categoryId: null,
      tags: [],
      authorId,
      reviewerId: null,
      publishedAt: null,
      lastReviewedAt: null,
      significantUpdate: false,
      seo: {
        seoTitle: "",
        metaDescription: "",
        focusKeyword: "",
        secondaryKeywords: [],
        canonicalUrl: "",
        robotsIndex: settings.defaultRobotsIndex,
        robotsFollow: settings.defaultRobotsFollow,
        ogTitle: "",
        ogDescription: "",
        ogImageId: null,
        twitterCard: "summary_large_image",
        twitterTitle: "",
        twitterDescription: "",
        breadcrumbEnabled: true,
        customMetaTags: [],
      },
      ai: {
        aiSummary: "",
        keyTakeaways: [],
        faqs: [],
        mainEntity: null,
        about: [],
        mentions: [],
        ...DEFAULT_AI_CONTEXT,
      },
      schemaExtras: { howToSteps: [], video: null, review: null, product: null, speakableEnabled: true },
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------------------------

function collectContentMediaIds(node: PMNode, out: Set<string>) {
  if (node.type === "image" && node.attrs?.mediaId) out.add(String(node.attrs.mediaId));
  node.content?.forEach((c) => collectContentMediaIds(c, out));
}

async function resolveTags(tags: PostData["tags"], session?: mongoose.ClientSession): Promise<mongoose.Types.ObjectId[]> {
  const ids: mongoose.Types.ObjectId[] = [];
  for (const t of tags) {
    if (t.id) {
      ids.push(oid(t.id));
      continue;
    }
    const slug = slugify(t.name, { maxLength: 60 });
    if (!slug) continue;
    const doc = await Tag.findOneAndUpdate(
      { slug },
      { $setOnInsert: { name: t.name.trim(), slug } },
      { upsert: true, returnDocument: "after", session },
    ).lean();
    if (doc) ids.push(doc._id);
  }
  return [...new Map(ids.map((i) => [i.toString(), i])).values()];
}

async function snapshotRevision(
  postId: mongoose.Types.ObjectId,
  data: PostData,
  userId: string,
  reason: "autosave" | "manual" | "publish" | "restore",
) {
  await PostRevision.create({ postId, snapshot: data, userId: oid(userId), reason });
  const stale = await PostRevision.find({ postId })
    .sort({ createdAt: -1 })
    .skip(REVISION_LIMIT)
    .select({ _id: 1 })
    .lean();
  if (stale.length) await PostRevision.deleteMany({ _id: { $in: stale.map((r) => r._id) } });
}

async function slugsFor(post: Pick<LeanPost, "categoryId" | "tags" | "authorId" | "reviewerId">) {
  const [cat, tags, authors] = await Promise.all([
    post.categoryId ? Category.findById(post.categoryId).select({ slug: 1 }).lean() : null,
    post.tags?.length ? Tag.find({ _id: { $in: post.tags } }).select({ slug: 1 }).lean() : [],
    Author.find({ _id: { $in: [post.authorId, post.reviewerId].filter(defined) } }).select({ slug: 1 }).lean(),
  ]);
  return {
    categorySlugs: cat ? [cat.slug] : [],
    tagSlugs: tags.map((t) => t.slug),
    authorSlugs: authors.map((a) => a.slug),
  };
}

export async function computeScores(data: PostData, existing: LeanPost | null, modifiedAt: Date | null) {
  const [author, featured, brokenLinks] = await Promise.all([
    Author.findById(data.authorId).select({ bio: 1, credentials: 1, jobTitle: 1, sameAs: 1 }).lean(),
    data.featuredImageId ? Media.findById(data.featuredImageId).select({ alt: 1, sizeBytes: 1 }).lean() : null,
    existing ? LinkCheck.countDocuments({ postId: existing._id, isBroken: true }) : 0,
  ]);
  const report = scorePost(
    toScoreInput(data as PostInput, {
      author: author ? { hasBio: Boolean(author.bio?.trim()), hasCredentials: Boolean(author.credentials?.trim() || author.jobTitle?.trim()), hasProfiles: Boolean(author.sameAs?.length) } : null,
      featuredImageAlt: featured?.alt ?? "",
      featuredImageSize: featured?.sizeBytes ?? undefined,
      modifiedAt: modifiedAt ? modifiedAt.toISOString() : null,
      brokenLinks,
    }),
  );
  return scoreSummary(report);
}

const RESERVED_SLUGS = new Set(["page", "category", "tag", "author", "preview"]);

const AUTOSAVE_REVISION_INTERVAL_MS = 5 * 60 * 1000;

export async function savePost(opts: {
  user: SessionUser;
  id: string | null;
  input: unknown;
  intent: SaveIntent;
  scheduledFor?: string | null;
}): Promise<SaveResult> {
  const { user, intent } = opts;
  await connectDB();
  const data = postSchema.parse(opts.input);
  const existing = opts.id ? await Post.findById(opts.id).lean() : null;
  if (opts.id && !existing) throw new UserFacingError("This post no longer exists.");
  if (existing?.deletedAt) throw new UserFacingError("This post is in the trash. Restore it before editing.");
  assertCanEdit(user, existing);

  const publishing = intent === "publish" || intent === "schedule" || intent === "update" || intent === "unpublish";
  if (publishing && !can.publish(user.role)) throw new UserFacingError("Only editors and admins can publish posts.");
  if (!can.editAnyPost(user.role)) {
    if (!user.authorId) throw new UserFacingError("Your account has no author profile yet. Ask an admin to link one.");
    data.authorId = user.authorId; // authors always write as themselves
  }

  // Published / scheduled posts autosave into revisions only, never onto the live document.
  if (intent === "autosave" && existing && existing.status !== "DRAFT") {
    const last = await PostRevision.findOne({ postId: existing._id }).sort({ createdAt: -1 }).select({ createdAt: 1 }).lean();
    const due = !last || Date.now() - new Date(last.createdAt).getTime() > AUTOSAVE_REVISION_INTERVAL_MS;
    if (due) await snapshotRevision(existing._id, data, user.id, "autosave");
    return { meta: toEditorMeta(existing), savedAt: new Date().toISOString(), revisionCreated: due };
  }

  // Slug: must be unique among all posts (including trash, so restoring can't collide) and must
  // not shadow a /blog/<segment> route.
  let slug = data.slug || slugify(data.title) || "untitled";
  if (RESERVED_SLUGS.has(slug)) {
    if (intent !== "autosave" && data.slug) throw new UserFacingError(`“${slug}” is reserved by the blog. Choose another slug.`, { slug: "Reserved" });
    slug = `${slug}-post`;
  }
  const clash = await Post.exists({ slug, ...(existing ? { _id: { $ne: existing._id } } : {}) });
  if (clash) {
    if (intent === "autosave" || !data.slug) {
      data.slug = await uniqueSlug(slug, async (s) => Boolean(await Post.exists({ slug: s, _id: { $ne: existing?._id } })));
    } else {
      throw new UserFacingError("Another post already uses this URL slug.", { slug: "Slug already in use" });
    }
  } else {
    data.slug = slug;
  }

  // Render & derive.
  const contentMediaIds = new Set<string>();
  collectContentMediaIds(data.content as PMNode, contentMediaIds);
  const media = await getMediaMap([...contentMediaIds]);
  const rendered = await renderContent(data.content as PMNode, { keyTakeaways: data.ai.keyTakeaways, faqs: data.ai.faqs, media });
  const mediaIds = new Set<string>([
    ...contentMediaIds,
    ...[data.featuredImageId, data.seo.ogImageId, data.schemaExtras.video?.thumbnailId, ...data.schemaExtras.howToSteps.map((h) => h.imageId)].filter(
      (v): v is string => Boolean(v),
    ),
  ]);

  // Status & dates.
  const now = new Date();
  const prevStatus = existing?.status ?? "DRAFT";
  let status = prevStatus;
  let publishedAt = existing?.publishedAt ?? null;
  let scheduledFor = existing?.scheduledFor ?? null;
  let modifiedAt = existing?.modifiedAt ?? null;
  const requestedPublishedAt = data.publishedAt ? new Date(data.publishedAt) : null;

  switch (intent) {
    case "draft":
    case "autosave":
      if (prevStatus === "PUBLISHED") throw new UserFacingError("This post is live. Use Update to save changes.");
      break;
    case "publish": {
      if (requestedPublishedAt && requestedPublishedAt.getTime() > now.getTime() + 60_000) {
        throw new UserFacingError("The publish date is in the future. Use Schedule instead.");
      }
      status = "PUBLISHED";
      publishedAt = requestedPublishedAt ?? publishedAt ?? now;
      scheduledFor = null;
      modifiedAt = prevStatus === "PUBLISHED" && data.significantUpdate ? now : (modifiedAt ?? publishedAt);
      break;
    }
    case "schedule": {
      const when = opts.scheduledFor ? new Date(opts.scheduledFor) : null;
      if (!when || Number.isNaN(when.getTime()) || when.getTime() <= now.getTime()) {
        throw new UserFacingError("Pick a future date and time to schedule this post.");
      }
      if (prevStatus === "PUBLISHED") throw new UserFacingError("This post is already live.");
      status = "SCHEDULED";
      scheduledFor = when;
      publishedAt = null;
      break;
    }
    case "update":
      if (prevStatus !== "PUBLISHED") throw new UserFacingError("Only published posts can be updated.");
      if (requestedPublishedAt) publishedAt = requestedPublishedAt;
      if (data.significantUpdate) modifiedAt = now;
      break;
    case "unpublish":
      status = "DRAFT";
      scheduledFor = null;
      break;
  }

  // Authoritative scores (same pure functions as the editor's live panel).
  const scores = await computeScores(data, existing, modifiedAt);
  if ((intent === "publish" || intent === "schedule") && prevStatus !== "PUBLISHED") {
    const settings = await readSiteSettings();
    if (settings.blockPublishBelowScore > 0 && scores.seo < settings.blockPublishBelowScore) {
      throw new UserFacingError(`The SEO score is ${scores.seo}; Settings require at least ${settings.blockPublishBelowScore} to publish. See Score & Checklist.`);
    }
  }

  const tagIds = await resolveTags(data.tags);
  const doc = {
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt,
    content: data.content,
    contentHtml: rendered.html,
    contentText: rendered.text,
    wordCount: rendered.wordCount,
    readingTimeMinutes: rendered.readingTimeMinutes,
    featuredImageId: data.featuredImageId,
    featuredImageAlt: data.featuredImageAlt,
    featuredImageCaption: data.featuredImageCaption,
    featuredImageTitle: data.featuredImageTitle,
    categoryId: data.categoryId,
    tags: tagIds,
    authorId: oid(data.authorId),
    reviewerId: data.reviewerId,
    status,
    publishedAt,
    scheduledFor,
    modifiedAt,
    lastReviewedAt: data.lastReviewedAt ? new Date(data.lastReviewedAt) : null,
    seo: data.seo,
    ai: data.ai,
    schemaExtras: data.schemaExtras,
    mediaIds: [...mediaIds].map(oid),
    scores: { ...scores, computedAt: now },
  };

  // A live post whose slug changes gets a 301 from the old URL, atomically with the rename.
  const oldLiveSlug = existing && prevStatus === "PUBLISHED" && existing.slug !== data.slug ? existing.slug : null;
  let saved: LeanPost | null;
  if (oldLiveSlug) {
    saved = await withTransaction(async (session) => {
      const post = await Post.findOneAndUpdate({ _id: existing!._id }, { $set: doc }, { returnDocument: "after", session }).lean();
      await upsertSlugRedirect(`/blog/${oldLiveSlug}`, `/blog/${data.slug}`, session);
      return post;
    });
  } else if (existing) {
    saved = await Post.findOneAndUpdate({ _id: existing._id }, { $set: doc }, { returnDocument: "after" }).lean();
  } else {
    const created = await Post.create({ ...doc, createdById: oid(user.id) });
    saved = created.toObject() as LeanPost;
  }
  if (!saved) throw new UserFacingError("This post no longer exists.");

  // Revisions: every explicit save/publish; autosaves at most every few minutes.
  let revisionCreated = false;
  if (intent !== "autosave") {
    await snapshotRevision(saved._id, data, user.id, intent === "draft" ? "manual" : "publish");
    revisionCreated = true;
  } else {
    const last = await PostRevision.findOne({ postId: saved._id }).sort({ createdAt: -1 }).select({ createdAt: 1 }).lean();
    if (!last || Date.now() - new Date(last.createdAt).getTime() > AUTOSAVE_REVISION_INTERVAL_MS) {
      await snapshotRevision(saved._id, data, user.id, "autosave");
      revisionCreated = true;
    }
  }

  // Expire every public page the post was or is visible on.
  if (prevStatus === "PUBLISHED" || status === "PUBLISHED") {
    const after = await slugsFor(saved);
    const before = existing ? await slugsFor(existing) : { categorySlugs: [], tagSlugs: [], authorSlugs: [] };
    expireTags(
      postTags({
        slug: saved.slug,
        previousSlug: oldLiveSlug,
        categorySlugs: [...after.categorySlugs, ...before.categorySlugs],
        tagSlugs: [...after.tagSlugs, ...before.tagSlugs],
        authorSlugs: [...after.authorSlugs, ...before.authorSlugs],
      }),
    );
  }

  // Search engines: new/changed live URLs are "updated"; URLs that stopped being live are "deleted".
  const indexable = saved.seo?.robotsIndex !== false;
  if (status === "PUBLISHED" && indexable && intent !== "autosave") {
    queueIndexing([blogUrl(saved.slug), ...(oldLiveSlug ? [blogUrl(oldLiveSlug)] : [])], "URL_UPDATED");
  } else if (prevStatus === "PUBLISHED" && status !== "PUBLISHED") {
    queueIndexing([blogUrl(existing!.slug)], "URL_DELETED");
  }

  return { meta: toEditorMeta(saved), savedAt: new Date().toISOString(), revisionCreated };
}

/**
 * Creates/updates `from → to`, re-points older redirects that ended at `from` (no chains),
 * and removes any redirect that would now loop away from the live URL.
 */
export async function upsertSlugRedirect(from: string, to: string, session?: mongoose.ClientSession) {
  if (from === to) return;
  await Redirect.deleteOne({ fromPath: to }, { session });
  await Redirect.updateMany({ toPath: from }, { $set: { toPath: to } }, { session });
  await Redirect.updateOne(
    { fromPath: from },
    { $set: { toPath: to, statusCode: 301, automatic: true }, $setOnInsert: { hits: 0 } },
    { upsert: true, session },
  );
}


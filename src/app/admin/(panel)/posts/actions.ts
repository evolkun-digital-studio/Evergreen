"use server";

import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Author, Category, LinkCheck, Post, PostRevision, Tag, User } from "@/lib/models";
import { requireActionUser } from "@/lib/auth/session";
import { runAction, UserFacingError } from "@/lib/actions";
import { can, SITE_URL } from "@/lib/cms/constants";
import { assertCanEdit, savePost } from "@/lib/posts/service";
import { expireTags, postTags } from "@/lib/revalidate";
import { createPreviewPath } from "@/lib/preview";
import { blogUrl, queueIndexing } from "@/lib/indexing/queue";
import { slugify, uniqueSlug } from "@/lib/slug";
import { defined } from "@/lib/utils";
import { SAVE_INTENTS, postSchema, type PostData } from "@/lib/validation/post";
import { toPublicPost } from "@/lib/data/blog";
import { readSiteSettings } from "@/lib/data/settings";
import { buildSchema, validateSchema } from "@/lib/seo/schema";
import { countWords, docToText, readingTimeMinutes } from "@/lib/content/text";
import type { PMNode } from "@/lib/content/types";
import type { PostDoc } from "@/lib/models";
import type { RevisionSummary } from "@/lib/posts/editor-types";

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");
const ids = z.array(objectId).min(1).max(200);

export async function savePostAction(id: string | null, input: unknown, intent: string, scheduledFor?: string | null) {
  return runAction(async () => {
    const user = await requireActionUser();
    return savePost({
      user,
      id: id ? objectId.parse(id) : null,
      input,
      intent: z.enum(SAVE_INTENTS).parse(intent),
      scheduledFor: scheduledFor ?? null,
    });
  });
}

export async function checkSlugAction(slug: string, excludeId: string | null) {
  return runAction(async () => {
    await requireActionUser();
    await connectDB();
    const clean = slugify(slug);
    const taken = Boolean(await Post.exists({ slug: clean, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }));
    return { slug: clean, available: !taken };
  });
}

export async function previewUrlAction(id: string) {
  return runAction(async () => {
    const user = await requireActionUser();
    await connectDB();
    const post = await Post.findById(objectId.parse(id)).select({ status: 1, createdById: 1, authorId: 1 }).lean();
    if (!post) throw new UserFacingError("Save the post first.");
    if (!can.editAnyPost(user.role)) assertCanEdit(user, { ...post, status: "DRAFT" });
    return createPreviewPath(id);
  });
}

/** Internal-link search for the editor's link popover. */
export async function searchPostsForLinkAction(q: string) {
  return runAction(async () => {
    await requireActionUser();
    await connectDB();
    const term = q.trim();
    const filter: Record<string, unknown> = { deletedAt: null, status: "PUBLISHED" };
    if (term) filter.title = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const posts = await Post.find(filter).sort({ publishedAt: -1 }).limit(8).select({ title: 1, slug: 1 }).lean();
    return posts.map((p) => ({ id: p._id.toString(), title: p.title, path: `/blog/${p.slug}`, url: `${SITE_URL}/blog/${p.slug}` }));
  });
}

// --- Revisions ---------------------------------------------------------------------------------

export async function listRevisionsAction(postId: string) {
  return runAction(async (): Promise<RevisionSummary[]> => {
    const user = await requireActionUser();
    await connectDB();
    const post = await Post.findById(objectId.parse(postId)).select({ status: 1, createdById: 1, authorId: 1 }).lean();
    if (!post) throw new UserFacingError("This post no longer exists.");
    if (!can.editAnyPost(user.role)) assertCanEdit(user, post);
    const revisions = await PostRevision.find({ postId: post._id })
      .sort({ createdAt: -1 })
      .select({ createdAt: 1, reason: 1, userId: 1, "snapshot.title": 1 })
      .lean();
    const users = await User.find({ _id: { $in: revisions.map((r) => r.userId).filter(defined) } }).select({ name: 1 }).lean();
    const names = new Map(users.map((u) => [u._id.toString(), u.name]));
    return revisions.map((r) => ({
      id: r._id.toString(),
      createdAt: new Date(r.createdAt).toISOString(),
      reason: r.reason,
      userName: names.get(String(r.userId)) ?? "Unknown",
      title: (r.snapshot as { title?: string })?.title ?? "",
    }));
  });
}

export async function getRevisionAction(revisionId: string) {
  return runAction(async () => {
    const user = await requireActionUser();
    await connectDB();
    const rev = await PostRevision.findById(objectId.parse(revisionId)).lean();
    if (!rev) throw new UserFacingError("Revision not found.");
    const post = await Post.findById(rev.postId).select({ status: 1, createdById: 1, authorId: 1 }).lean();
    if (!can.editAnyPost(user.role)) assertCanEdit(user, post);
    return rev.snapshot as PostData;
  });
}

// --- Lifecycle ---------------------------------------------------------------------------------

async function expireForPosts(postIds: mongoose.Types.ObjectId[]) {
  const posts = await Post.find({ _id: { $in: postIds } }).select({ slug: 1, categoryId: 1, tags: 1, authorId: 1 }).lean();
  const [cats, tags, authors] = await Promise.all([
    Category.find({ _id: { $in: posts.map((p) => p.categoryId).filter(defined) } }).select({ slug: 1 }).lean(),
    Tag.find({ _id: { $in: posts.flatMap((p) => p.tags ?? []) } }).select({ slug: 1 }).lean(),
    Author.find({ _id: { $in: posts.map((p) => p.authorId) } }).select({ slug: 1 }).lean(),
  ]);
  expireTags(
    posts.flatMap((p) =>
      postTags({
        slug: p.slug,
        categorySlugs: cats.map((c) => c.slug),
        tagSlugs: tags.map((t) => t.slug),
        authorSlugs: authors.map((a) => a.slug),
      }),
    ),
  );
}

async function queueDeleted(ids: mongoose.Types.ObjectId[]) {
  if (!ids.length) return;
  const posts = await Post.find({ _id: { $in: ids } }).select({ slug: 1 }).lean();
  queueIndexing(posts.map((p) => blogUrl(p.slug)), "URL_DELETED");
}

export async function duplicatePostAction(id: string) {
  return runAction(async () => {
    const user = await requireActionUser();
    await connectDB();
    const src = await Post.findById(objectId.parse(id)).lean();
    if (!src) throw new UserFacingError("This post no longer exists.");
    if (!can.editAnyPost(user.role)) assertCanEdit(user, { ...src, status: "DRAFT" });
    const slug = await uniqueSlug(`${src.slug}-copy`, async (s) => Boolean(await Post.exists({ slug: s })));
    const { _id, createdAt, updatedAt, ...rest } = src as typeof src & { createdAt: Date; updatedAt: Date };
    void _id;
    void createdAt;
    void updatedAt;
    const copy = await Post.create({
      ...rest,
      title: `${src.title} (copy)`,
      slug,
      status: "DRAFT",
      publishedAt: null,
      scheduledFor: null,
      modifiedAt: null,
      deletedAt: null,
      createdById: new mongoose.Types.ObjectId(user.id),
      ...(can.editAnyPost(user.role) ? {} : { authorId: new mongoose.Types.ObjectId(user.authorId!) }),
    });
    return copy._id.toString();
  }, "Post duplicated");
}

/** Bulk/single actions from the posts table. */
export async function bulkPostAction(action: string, postIds: string[]) {
  return runAction(async () => {
    const user = await requireActionUser();
    const op = z.enum(["publish", "draft", "trash", "restore", "delete"]).parse(action);
    const list = ids.parse(postIds).map((i) => new mongoose.Types.ObjectId(i));
    await connectDB();

    const posts = await Post.find({ _id: { $in: list } }).select({ status: 1, createdById: 1, authorId: 1, deletedAt: 1, title: 1 }).lean();
    if (!can.editAnyPost(user.role)) {
      if (op === "publish" || op === "delete") throw new UserFacingError("Only editors and admins can do that.");
      for (const p of posts) assertCanEdit(user, p);
    }
    const now = new Date();

    switch (op) {
      case "publish": {
        const drafts = posts.filter((p) => !p.deletedAt && p.status !== "PUBLISHED").map((p) => p._id);
        await Post.updateMany({ _id: { $in: drafts }, publishedAt: null }, { $set: { publishedAt: now, modifiedAt: now } });
        await Post.updateMany({ _id: { $in: drafts } }, { $set: { status: "PUBLISHED", scheduledFor: null } });
        await expireForPosts(drafts);
        const live = await Post.find({ _id: { $in: drafts }, "seo.robotsIndex": { $ne: false } }).select({ slug: 1 }).lean();
        queueIndexing(live.map((p) => blogUrl(p.slug)), "URL_UPDATED");
        return `${drafts.length} post${drafts.length === 1 ? "" : "s"} published`;
      }
      case "draft": {
        const live = posts.filter((p) => p.status === "PUBLISHED").map((p) => p._id);
        await Post.updateMany({ _id: { $in: list }, deletedAt: null }, { $set: { status: "DRAFT", scheduledFor: null } });
        await expireForPosts(live);
        await queueDeleted(live);
        return `${list.length} post${list.length === 1 ? "" : "s"} moved to draft`;
      }
      case "trash": {
        const live = posts.filter((p) => p.status === "PUBLISHED").map((p) => p._id);
        // Trashed posts come back as drafts, so a restore never silently re-publishes.
        await Post.updateMany({ _id: { $in: list } }, { $set: { deletedAt: now, status: "DRAFT", scheduledFor: null } });
        await expireForPosts(live);
        await queueDeleted(live);
        return `${list.length} post${list.length === 1 ? "" : "s"} moved to trash`;
      }
      case "restore":
        await Post.updateMany({ _id: { $in: list } }, { $set: { deletedAt: null } });
        return `${list.length} post${list.length === 1 ? "" : "s"} restored as draft`;
      case "delete": {
        const trashed = posts.filter((p) => p.deletedAt).map((p) => p._id);
        await Promise.all([
          Post.deleteMany({ _id: { $in: trashed } }),
          PostRevision.deleteMany({ postId: { $in: trashed } }),
          LinkCheck.deleteMany({ postId: { $in: trashed } }),
        ]);
        return `${trashed.length} post${trashed.length === 1 ? "" : "s"} permanently deleted`;
      }
    }
  });
}

/**
 * Schema tab: builds the JSON-LD the published page would output for the current, unsaved
 * editor values (same code path as the live page), plus local validation.
 */
export async function schemaPreviewAction(id: string | null, input: unknown) {
  return runAction(async () => {
    await requireActionUser();
    const data = postSchema.parse(input);
    await connectDB();
    const existing = id ? await Post.findById(objectId.parse(id)).select({ publishedAt: 1, modifiedAt: 1, createdAt: 1, status: 1 }).lean() : null;
    const now = new Date();
    const text = docToText(data.content as PMNode, data.ai);
    const words = countWords(text);
    const publishedAt = data.publishedAt ? new Date(data.publishedAt) : (existing?.publishedAt ?? now);
    const draft = {
      ...data,
      _id: existing?._id ?? new mongoose.Types.ObjectId(),
      tags: data.tags.filter((t) => t.id).map((t) => t.id),
      contentHtml: "",
      contentText: text,
      wordCount: words,
      readingTimeMinutes: readingTimeMinutes(words),
      publishedAt,
      modifiedAt: data.significantUpdate ? now : (existing?.modifiedAt ?? publishedAt),
      lastReviewedAt: data.lastReviewedAt ? new Date(data.lastReviewedAt) : null,
      createdAt: (existing as { createdAt?: Date } | null)?.createdAt ?? now,
      schemaExtras: {
        ...data.schemaExtras,
        video: data.schemaExtras.video ? { ...data.schemaExtras.video, uploadDate: data.schemaExtras.video.uploadDate ? new Date(data.schemaExtras.video.uploadDate) : null } : null,
      },
    } as unknown as PostDoc;
    const [post, settings] = await Promise.all([toPublicPost(draft), readSiteSettings()]);
    const graph = buildSchema(post, settings);
    return {
      json: JSON.stringify(graph, null, 2),
      issues: validateSchema(graph, post),
      url: `${SITE_URL}/blog/${data.slug}`,
      live: existing?.status === "PUBLISHED",
    };
  });
}

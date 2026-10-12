"use server";

import mongoose from "mongoose";
import { z } from "zod";
import { connectDB, withTransaction } from "@/lib/db";
import { Post, Tag } from "@/lib/models";
import { requireActionUser } from "@/lib/auth/session";
import { runAction, UserFacingError } from "@/lib/actions";
import { termSchema } from "@/lib/validation/taxonomy";
import { upsertSlugRedirect } from "@/lib/posts/service";
import { expireTags } from "@/lib/revalidate";
import { TAGS } from "@/lib/cache-tags";

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");

export async function saveTagAction(id: string | null, input: unknown) {
  return runAction(async () => {
    await requireActionUser("manageTaxonomy");
    const data = termSchema.parse(input);
    await connectDB();
    if (await Tag.exists({ slug: data.slug, ...(id ? { _id: { $ne: id } } : {}) })) {
      throw new UserFacingError("Another tag already uses this slug.", { slug: "Slug already in use" });
    }
    if (!id) {
      await Tag.create(data);
    } else {
      const existing = await Tag.findById(id).lean();
      if (!existing) throw new UserFacingError("This tag no longer exists.");
      if (existing.slug !== data.slug) {
        await withTransaction(async (session) => {
          await Tag.updateOne({ _id: id }, { $set: data }, { session });
          await upsertSlugRedirect(`/blog/tag/${existing.slug}`, `/blog/tag/${data.slug}`, session);
        });
        expireTags([TAGS.tag(existing.slug), TAGS.redirects]);
      } else {
        await Tag.updateOne({ _id: id }, { $set: data });
      }
    }
    expireTags([TAGS.tags, TAGS.tag(data.slug), TAGS.posts, TAGS.sitemap]);
  }, id ? "Tag saved" : "Tag created");
}

export async function deleteTagAction(id: string) {
  return runAction(async () => {
    await requireActionUser("manageTaxonomy");
    await connectDB();
    const tag = await Tag.findById(objectId.parse(id)).lean();
    if (!tag) throw new UserFacingError("This tag no longer exists.");
    await withTransaction(async (session) => {
      await Post.updateMany({ tags: tag._id }, { $pull: { tags: tag._id } }, { session });
      await Tag.deleteOne({ _id: tag._id }, { session });
    });
    expireTags([TAGS.tags, TAGS.tag(tag.slug), TAGS.posts, TAGS.sitemap]);
  }, "Tag deleted");
}

/** Moves every post from the source tags onto the target, deletes the sources, and 301s their archives. */
export async function mergeTagsAction(sourceIds: string[], targetId: string) {
  return runAction(async () => {
    await requireActionUser("manageTaxonomy");
    const target = objectId.parse(targetId);
    const sources = z.array(objectId).min(1).parse(sourceIds).filter((s) => s !== target);
    if (!sources.length) throw new UserFacingError("Pick at least one tag other than the target.");
    await connectDB();
    const [targetTag, sourceTags] = await Promise.all([Tag.findById(target).lean(), Tag.find({ _id: { $in: sources } }).lean()]);
    if (!targetTag) throw new UserFacingError("The target tag no longer exists.");
    const sourceOids = sourceTags.map((t) => t._id);

    await withTransaction(async (session) => {
      await Post.updateMany({ tags: { $in: sourceOids } }, { $addToSet: { tags: targetTag._id } }, { session });
      await Post.updateMany({ tags: { $in: sourceOids } }, { $pull: { tags: { $in: sourceOids } } }, { session });
      await Tag.deleteMany({ _id: { $in: sourceOids } }, { session });
      for (const s of sourceTags) await upsertSlugRedirect(`/blog/tag/${s.slug}`, `/blog/tag/${targetTag.slug}`, session);
    });
    expireTags([TAGS.tags, TAGS.posts, TAGS.sitemap, TAGS.redirects, TAGS.tag(targetTag.slug), ...sourceTags.map((s) => TAGS.tag(s.slug))]);
    return `${sourceTags.length} tag${sourceTags.length > 1 ? "s" : ""} merged into “${targetTag.name}”`;
  });
}

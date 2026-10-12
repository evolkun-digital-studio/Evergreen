"use server";

import mongoose from "mongoose";
import { connectDB, withTransaction } from "@/lib/db";
import { Author, Post, User } from "@/lib/models";
import { requireActionUser } from "@/lib/auth/session";
import { runAction, UserFacingError } from "@/lib/actions";
import { authorSchema } from "@/lib/validation/taxonomy";
import { upsertSlugRedirect } from "@/lib/posts/service";
import { expireTags } from "@/lib/revalidate";
import { TAGS } from "@/lib/cache-tags";

export async function saveAuthorAction(id: string | null, input: unknown) {
  return runAction(async () => {
    await requireActionUser("manageAuthors");
    const data = authorSchema.parse(input);
    await connectDB();
    if (await Author.exists({ slug: data.slug, ...(id ? { _id: { $ne: id } } : {}) })) {
      throw new UserFacingError("Another author already uses this slug.", { slug: "Slug already in use" });
    }
    if (!id) {
      const created = await Author.create(data);
      expireTags([TAGS.authors]);
      return created._id.toString();
    }
    const existing = await Author.findById(id).lean();
    if (!existing) throw new UserFacingError("This author no longer exists.");
    if (existing.slug !== data.slug) {
      await withTransaction(async (session) => {
        await Author.updateOne({ _id: id }, { $set: data }, { session });
        await upsertSlugRedirect(`/blog/author/${existing.slug}`, `/blog/author/${data.slug}`, session);
      });
      expireTags([TAGS.author(existing.slug), TAGS.redirects]);
    } else {
      await Author.updateOne({ _id: id }, { $set: data });
    }
    // Author name, bio and credentials appear on every one of their articles (byline, Person schema).
    expireTags([TAGS.authors, TAGS.author(data.slug), TAGS.posts, TAGS.sitemap]);
    return id;
  }, "Author saved");
}

export async function deleteAuthorAction(id: string) {
  return runAction(async () => {
    await requireActionUser("manageAuthors");
    if (!mongoose.isValidObjectId(id)) throw new UserFacingError("Invalid author.");
    await connectDB();
    const used = await Post.countDocuments({ $or: [{ authorId: id }, { reviewerId: id }] });
    if (used) throw new UserFacingError(`${used} post${used > 1 ? "s are" : " is"} written or reviewed by this author. Reassign them first.`);
    const author = await Author.findByIdAndDelete(id).lean();
    if (!author) throw new UserFacingError("This author no longer exists.");
    await User.updateMany({ authorId: id }, { $set: { authorId: null } });
    expireTags([TAGS.authors, TAGS.author(author.slug), TAGS.sitemap]);
  }, "Author deleted");
}

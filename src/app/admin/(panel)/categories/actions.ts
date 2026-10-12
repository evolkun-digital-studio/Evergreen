"use server";

import mongoose from "mongoose";
import { connectDB, withTransaction } from "@/lib/db";
import { Category, Post } from "@/lib/models";
import { requireActionUser } from "@/lib/auth/session";
import { runAction, UserFacingError } from "@/lib/actions";
import { categorySchema } from "@/lib/validation/taxonomy";
import { upsertSlugRedirect } from "@/lib/posts/service";
import { expireTags } from "@/lib/revalidate";
import { TAGS } from "@/lib/cache-tags";

export async function saveCategoryAction(id: string | null, input: unknown) {
  return runAction(async () => {
    await requireActionUser("manageTaxonomy");
    const data = categorySchema.parse(input);
    await connectDB();
    if (await Category.exists({ slug: data.slug, ...(id ? { _id: { $ne: id } } : {}) })) {
      throw new UserFacingError("Another category already uses this slug.", { slug: "Slug already in use" });
    }
    if (id && data.parentId === id) throw new UserFacingError("A category can't be its own parent.", { parentId: "Invalid parent" });

    if (!id) {
      await Category.create(data);
    } else {
      const existing = await Category.findById(id).lean();
      if (!existing) throw new UserFacingError("This category no longer exists.");
      if (existing.slug !== data.slug) {
        await withTransaction(async (session) => {
          await Category.updateOne({ _id: id }, { $set: data }, { session });
          await upsertSlugRedirect(`/blog/category/${existing.slug}`, `/blog/category/${data.slug}`, session);
        });
        expireTags([TAGS.category(existing.slug), TAGS.redirects]);
      } else {
        await Category.updateOne({ _id: id }, { $set: data });
      }
    }
    expireTags([TAGS.categories, TAGS.category(data.slug), TAGS.posts, TAGS.sitemap]);
  }, id ? "Category saved" : "Category created");
}

export async function deleteCategoryAction(id: string) {
  return runAction(async () => {
    await requireActionUser("manageTaxonomy");
    if (!mongoose.isValidObjectId(id)) throw new UserFacingError("Invalid category.");
    await connectDB();
    const used = await Post.countDocuments({ categoryId: id, deletedAt: null });
    if (used) throw new UserFacingError(`${used} post${used > 1 ? "s use" : " uses"} this category. Move them to another category first.`);
    const cat = await Category.findByIdAndDelete(id).lean();
    if (!cat) throw new UserFacingError("This category no longer exists.");
    await Category.updateMany({ parentId: id }, { $set: { parentId: cat.parentId ?? null } });
    expireTags([TAGS.categories, TAGS.category(cat.slug), TAGS.sitemap]);
  }, "Category deleted");
}

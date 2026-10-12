import "server-only";
import { connectDB } from "@/lib/db";
import { Category, Post, Tag } from "@/lib/models";
import { getMediaMap } from "@/lib/data/media";
import { defined } from "@/lib/utils";

export type TermRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  seoTitle: string;
  metaDescription: string;
  postCount: number;
  // categories only
  parentId?: string | null;
  ogImageId?: string | null;
  sortOrder?: number;
};

async function countBy(field: "categoryId" | "tags") {
  const pipeline =
    field === "tags"
      ? [{ $match: { deletedAt: null } }, { $unwind: "$tags" }, { $group: { _id: "$tags", n: { $sum: 1 } } }]
      : [{ $match: { deletedAt: null, categoryId: { $ne: null } } }, { $group: { _id: "$categoryId", n: { $sum: 1 } } }];
  const rows = await Post.aggregate<{ _id: unknown; n: number }>(pipeline);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

export async function listCategoriesForAdmin() {
  await connectDB();
  const [cats, counts] = await Promise.all([Category.find().sort({ sortOrder: 1, name: 1 }).lean(), countBy("categoryId")]);
  const media = await getMediaMap(cats.map((c) => c.ogImageId).filter(defined));
  const rows: TermRow[] = cats.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    seoTitle: c.seoTitle ?? "",
    metaDescription: c.metaDescription ?? "",
    postCount: counts.get(c._id.toString()) ?? 0,
    parentId: c.parentId?.toString() ?? null,
    ogImageId: c.ogImageId?.toString() ?? null,
    sortOrder: c.sortOrder ?? 0,
  }));
  return { rows, media: [...media.values()] };
}

export async function listTagsForAdmin() {
  await connectDB();
  const [tags, counts] = await Promise.all([Tag.find().sort({ name: 1 }).lean(), countBy("tags")]);
  const rows: TermRow[] = tags.map((t) => ({
    id: t._id.toString(),
    name: t.name,
    slug: t.slug,
    description: t.description ?? "",
    seoTitle: t.seoTitle ?? "",
    metaDescription: t.metaDescription ?? "",
    postCount: counts.get(t._id.toString()) ?? 0,
  }));
  return { rows, media: [] };
}

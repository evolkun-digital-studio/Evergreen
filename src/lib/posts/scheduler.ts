import "server-only";
import { connectDB } from "@/lib/db";
import { Author, Category, Post, Tag } from "@/lib/models";
import { expireTags, postTags } from "@/lib/revalidate";

/**
 * Publishes every SCHEDULED post whose time has come. Each post is claimed with an atomic
 * status check, so overlapping cron runs can't publish the same post twice.
 */
export async function publishDuePosts(now = new Date()) {
  await connectDB();
  const due = await Post.find({ status: "SCHEDULED", scheduledFor: { $lte: now }, deletedAt: null })
    .select({ _id: 1, scheduledFor: 1 })
    .limit(100)
    .lean();

  const published: { id: string; slug: string; indexable: boolean }[] = [];
  for (const p of due) {
    const post = await Post.findOneAndUpdate(
      { _id: p._id, status: "SCHEDULED" },
      { $set: { status: "PUBLISHED", publishedAt: p.scheduledFor, modifiedAt: p.scheduledFor, scheduledFor: null } },
      { returnDocument: "after" },
    ).lean();
    if (!post) continue;
    const [cat, tags, authors] = await Promise.all([
      post.categoryId ? Category.findById(post.categoryId).select({ slug: 1 }).lean() : null,
      Tag.find({ _id: { $in: post.tags ?? [] } }).select({ slug: 1 }).lean(),
      Author.find({ _id: { $in: [post.authorId, post.reviewerId].filter((x) => x != null) } }).select({ slug: 1 }).lean(),
    ]);
    expireTags(
      postTags({
        slug: post.slug,
        categorySlugs: cat ? [cat.slug] : [],
        tagSlugs: tags.map((t) => t.slug),
        authorSlugs: authors.map((a) => a.slug),
      }),
      "route",
    );
    published.push({ id: post._id.toString(), slug: post.slug, indexable: post.seo?.robotsIndex !== false });
  }
  return published;
}

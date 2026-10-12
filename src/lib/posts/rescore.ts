import "server-only";
import { connectDB } from "@/lib/db";
import { Post, type PostDoc } from "@/lib/models";
import { postSchema } from "@/lib/validation/post";
import { computeScores, toEditorPost } from "./service";

/** Recomputes and stores the scores of one post (or every post) without touching anything else. */
export async function rescorePosts(filter: Record<string, unknown> = { deletedAt: null }) {
  await connectDB();
  const posts = await Post.find(filter).lean<PostDoc[]>();
  let done = 0;
  for (const doc of posts) {
    const { values } = await toEditorPost(doc);
    const parsed = postSchema.safeParse(values);
    if (!parsed.success) continue; // e.g. legacy data the editor would ask to fix
    const scores = await computeScores(parsed.data, doc, doc.modifiedAt ?? null);
    await Post.updateOne({ _id: doc._id }, { $set: { scores: { ...scores, computedAt: new Date() } } }, { timestamps: false });
    done++;
  }
  return { total: posts.length, rescored: done };
}

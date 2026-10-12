import "server-only";
import { revalidateTag, updateTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";

/**
 * Expires public cache tags after a content change.
 * - In Server Actions use `updateTag` (read-your-writes: the editor's next view is fresh).
 * - In route handlers (cron jobs) `updateTag` isn't available; `expire: 0` gives the same
 *   "no stale content" guarantee for the next visitor.
 */
export function expireTags(tags: Iterable<string>, context: "action" | "route" = "action") {
  for (const tag of new Set(tags)) {
    if (context === "action") updateTag(tag);
    else revalidateTag(tag, { expire: 0 });
  }
}

/** Every public cache entry a post can appear in. */
export function postTags(post: {
  slug: string;
  previousSlug?: string | null;
  categorySlugs?: string[];
  tagSlugs?: string[];
  authorSlugs?: string[];
}): string[] {
  return [
    TAGS.posts,
    TAGS.sitemap,
    TAGS.post(post.slug),
    ...(post.previousSlug ? [TAGS.post(post.previousSlug), TAGS.redirects] : []),
    ...(post.categorySlugs ?? []).map(TAGS.category),
    ...(post.tagSlugs ?? []).map(TAGS.tag),
    ...(post.authorSlugs ?? []).map(TAGS.author),
  ];
}

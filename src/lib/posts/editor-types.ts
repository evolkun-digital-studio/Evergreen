// Client-safe shapes passed between the post editor and its Server Actions.
import type { PostStatus } from "@/lib/cms/constants";
import type { PostInput } from "@/lib/validation/post";
import type { MediaItem } from "@/lib/media/types";

export type EditorPostMeta = {
  id: string | null;
  status: PostStatus;
  publishedAt: string | null;
  scheduledFor: string | null;
  modifiedAt: string | null;
  updatedAt: string | null;
  /** Slug currently live on the site (for the "URL will change" warning). */
  publishedSlug: string | null;
  deletedAt: string | null;
};

export type EditorPost = { meta: EditorPostMeta; values: PostInput };

export type RevisionSummary = { id: string; createdAt: string; reason: string; userName: string; title: string };

export type SaveResult = { meta: EditorPostMeta; savedAt: string; revisionCreated: boolean };

export type Option = { id: string; name: string };

export type EditorOptions = {
  categories: Option[];
  authors: Option[];
  tags: Option[];
  /** Media referenced by the post (featured, OG, HowTo, video thumbnail) for previews. */
  media: MediaItem[];
  canPublish: boolean;
  /** Authors always write as themselves, so the author select is locked. */
  lockAuthor: boolean;
  /** Author profile completeness, for the GEO score. */
  authorProfiles: Record<string, { hasBio: boolean; hasCredentials: boolean; hasProfiles: boolean }>;
  /** Broken links found for this post by the last scan. */
  brokenLinks: number;
  siteName: string;
  defaultOgImageUrl: string;
};

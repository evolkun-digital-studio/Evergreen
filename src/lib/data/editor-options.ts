import "server-only";
import { connectDB } from "@/lib/db";
import { Author, Category, LinkCheck, Tag } from "@/lib/models";
import { readSiteSettings } from "@/lib/data/settings";
import { can } from "@/lib/cms/constants";
import { getMediaMap } from "@/lib/data/media";
import type { SessionUser } from "@/lib/auth/session";
import type { EditorOptions, EditorPost } from "@/lib/posts/editor-types";
import { defined } from "@/lib/utils";

/** Select options and referenced media for the post editor. */
export async function loadEditorOptions(user: SessionUser, post: EditorPost): Promise<EditorOptions> {
  await connectDB();
  const v = post.values;
  const [categories, authors, tags, media, brokenLinks, settings] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).select({ name: 1 }).lean(),
    Author.find().sort({ name: 1 }).select({ name: 1, bio: 1, credentials: 1, jobTitle: 1, sameAs: 1 }).lean(),
    Tag.find().sort({ name: 1 }).limit(1000).select({ name: 1 }).lean(),
    getMediaMap(
      [v.featuredImageId, v.seo.ogImageId, v.schemaExtras.video?.thumbnailId, ...v.schemaExtras.howToSteps.map((s) => s.imageId)].filter(defined),
    ),
    post.meta.id ? LinkCheck.countDocuments({ postId: post.meta.id, isBroken: true }) : 0,
    readSiteSettings(),
  ]);
  return {
    categories: categories.map((c) => ({ id: c._id.toString(), name: c.name })),
    authors: authors.map((a) => ({ id: a._id.toString(), name: a.name })),
    tags: tags.map((t) => ({ id: t._id.toString(), name: t.name })),
    media: [...media.values()],
    canPublish: can.publish(user.role),
    lockAuthor: !can.editAnyPost(user.role),
    authorProfiles: Object.fromEntries(
      authors.map((a) => [
        a._id.toString(),
        { hasBio: Boolean(a.bio?.trim()), hasCredentials: Boolean(a.credentials?.trim() || a.jobTitle?.trim()), hasProfiles: Boolean(a.sameAs?.length) },
      ]),
    ),
    brokenLinks,
    siteName: settings.siteTitle,
    defaultOgImageUrl: settings.defaultOgImageUrl,
  };
}

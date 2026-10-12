import type { PMNode } from "@/lib/content/types";
import type { PostInput } from "@/lib/validation/post";
import type { ScoreInput } from "./index";

/** Facts about the post that live outside the form (author profile, last link scan…). */
type ScoreContext = {
  author: ScoreInput["author"];
  featuredImageAlt?: string;
  featuredImageSize?: number;
  modifiedAt: string | null;
  brokenLinks: number;
};

/** Maps editor values to scorer input. Used identically by the editor and by savePost. */
export function toScoreInput(v: PostInput, ctx: ScoreContext): ScoreInput {
  const entity = (e: { name: string; sameAs: string } | null | undefined) => (e?.name ? { name: e.name, sameAs: e.sameAs ?? "" } : null);
  return {
    title: v.title ?? "",
    slug: v.slug ?? "",
    excerpt: v.excerpt ?? "",
    content: v.content as PMNode,
    seo: {
      seoTitle: v.seo.seoTitle ?? "",
      metaDescription: v.seo.metaDescription ?? "",
      focusKeyword: v.seo.focusKeyword ?? "",
      secondaryKeywords: v.seo.secondaryKeywords ?? [],
      canonicalUrl: v.seo.canonicalUrl ?? "",
      breadcrumbEnabled: v.seo.breadcrumbEnabled ?? true,
    },
    ai: {
      aiSummary: v.ai.aiSummary ?? "",
      keyTakeaways: v.ai.keyTakeaways ?? [],
      faqs: v.ai.faqs ?? [],
      mainEntity: entity(v.ai.mainEntity),
      about: (v.ai.about ?? []).map(entity).filter((e) => e !== null),
      mentions: (v.ai.mentions ?? []).map(entity).filter((e) => e !== null),
      contentType: v.ai.contentType ?? "Guide",
    },
    schemaExtras: {
      howToStepCount: v.schemaExtras.howToSteps?.length ?? 0,
      videoUrl: v.schemaExtras.video?.url ?? "",
      reviewItemName: v.schemaExtras.review?.itemName ?? "",
    },
    featuredImage: { set: Boolean(v.featuredImageId), alt: (v.featuredImageAlt || ctx.featuredImageAlt || "").trim(), sizeBytes: ctx.featuredImageSize },
    author: ctx.author,
    modifiedAt: ctx.modifiedAt,
    brokenLinks: ctx.brokenLinks,
  };
}

import { z } from "zod";
import {
  AI_SUMMARY_MAX,
  CONTENT_INTENTS,
  CONTENT_TYPES,
  ENTITY_TYPES,
  TWITTER_CARDS,
} from "@/lib/cms/constants";
import { SLUG_PATTERN } from "@/lib/slug";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const optionalId = z.union([objectId, z.literal(""), z.null()]).transform((v) => v || null);
const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Enter a full URL starting with https://");
const isoDate = z.union([z.string().datetime({ offset: true }), z.literal(""), z.null()]).transform((v) => v || null);

const entitySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  type: z.enum(ENTITY_TYPES),
  sameAs: optionalUrl,
});

const faqSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(300),
  answer: z.string().trim().min(1, "Answer is required").max(3000),
});

const seoSchema = z.object({
  seoTitle: z.string().trim().max(120),
  metaDescription: z.string().trim().max(320),
  focusKeyword: z.string().trim().max(100),
  secondaryKeywords: z.array(z.string().trim().min(1).max(100)).max(20),
  canonicalUrl: optionalUrl,
  robotsIndex: z.boolean(),
  robotsFollow: z.boolean(),
  ogTitle: z.string().trim().max(120),
  ogDescription: z.string().trim().max(320),
  ogImageId: optionalId,
  twitterCard: z.enum(TWITTER_CARDS),
  twitterTitle: z.string().trim().max(120),
  twitterDescription: z.string().trim().max(320),
  breadcrumbEnabled: z.boolean(),
  customMetaTags: z
    .array(
      z.object({
        attr: z.enum(["name", "property"]),
        key: z
          .string()
          .trim()
          .regex(/^[a-zA-Z][\w:.-]{0,80}$/, "Use letters, digits, : . - _"),
        content: z.string().trim().min(1).max(500),
      }),
    )
    .max(20),
});

const aiSchema = z.object({
  aiSummary: z.string().trim().max(AI_SUMMARY_MAX, `Keep the summary under ${AI_SUMMARY_MAX} characters`),
  keyTakeaways: z.array(z.string().trim().min(1).max(300)).max(7, "Use at most 7 takeaways"),
  faqs: z.array(faqSchema).max(30),
  mainEntity: entitySchema.nullable(),
  about: z.array(entitySchema).max(10),
  mentions: z.array(entitySchema).max(20),
  targetCountry: z.string().trim().max(2),
  targetLanguage: z.string().trim().max(10),
  targetAudience: z.string().trim().max(300),
  contentType: z.enum(CONTENT_TYPES),
  contentIntent: z.enum(CONTENT_INTENTS),
});

const schemaExtrasSchema = z.object({
  howToSteps: z
    .array(z.object({ name: z.string().trim().min(1).max(200), text: z.string().trim().min(1).max(2000), imageId: optionalId }))
    .max(50),
  video: z
    .object({
      url: optionalUrl,
      embedUrl: optionalUrl,
      name: z.string().trim().max(200),
      description: z.string().trim().max(1000),
      thumbnailId: optionalId,
      uploadDate: isoDate,
      duration: z
        .string()
        .trim()
        .refine((v) => v === "" || /^PT(?:\d+H)?(?:\d+M)?(?:\d+S)?$/.test(v), "Use ISO 8601, e.g. PT4M13S"),
    })
    .nullable(),
  review: z
    .object({
      itemName: z.string().trim().max(200),
      itemType: z.string().trim().max(60),
      ratingValue: z.number().min(0).max(100).nullable(),
      bestRating: z.number().min(1).max(100),
      pros: z.array(z.string().trim().min(1).max(300)).max(20),
      cons: z.array(z.string().trim().min(1).max(300)).max(20),
    })
    .nullable(),
  product: z
    .object({
      name: z.string().trim().max(200),
      brand: z.string().trim().max(200),
      sku: z.string().trim().max(100),
      priceRange: z.string().trim().max(60),
    })
    .nullable(),
  speakableEnabled: z.boolean(),
});

/** A tag chip in the editor: an existing tag id, or a new tag name to create on save. */
const tagRefSchema = z.object({ id: objectId.optional(), name: z.string().trim().min(1).max(60) });

export const postSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z.string().trim().max(120).regex(SLUG_PATTERN, "Lowercase letters, numbers and single hyphens only"),
  excerpt: z.string().trim().max(500),
  content: z.object({ type: z.literal("doc"), content: z.array(z.any()).optional() }).passthrough(),
  featuredImageId: optionalId,
  featuredImageAlt: z.string().trim().max(300),
  featuredImageCaption: z.string().trim().max(500),
  featuredImageTitle: z.string().trim().max(200),
  categoryId: optionalId,
  tags: z.array(tagRefSchema).max(20),
  authorId: objectId,
  reviewerId: optionalId,
  publishedAt: isoDate,
  lastReviewedAt: isoDate,
  /** When false, edits to a published post keep its public "Updated" date. */
  significantUpdate: z.boolean(),
  seo: seoSchema,
  ai: aiSchema,
  schemaExtras: schemaExtrasSchema,
});

export type PostInput = z.input<typeof postSchema>;
export type PostData = z.output<typeof postSchema>;

export const SAVE_INTENTS = ["draft", "autosave", "publish", "schedule", "update", "unpublish"] as const;
export type SaveIntent = (typeof SAVE_INTENTS)[number];

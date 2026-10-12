import "server-only";
import mongoose, { type InferSchemaType, type Model, type Types } from "mongoose";
import {
  CONTENT_INTENTS,
  CONTENT_TYPES,
  DEFAULT_AI_CONTEXT,
  ENTITY_TYPES,
  POST_STATUSES,
  TWITTER_CARDS,
} from "@/lib/cms/constants";

const { Schema, model, models } = mongoose;

// Everything below `seo`, `ai`, `schemaExtras` and `scores` belongs to exactly one post and is
// always read with it, so it is embedded. Shared data (author, category, tags, media) is referenced.

const EntitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ENTITY_TYPES, default: "Thing" },
    sameAs: { type: String, default: "" },
  },
  { _id: false },
);

const MetaTagSchema = new Schema(
  {
    attr: { type: String, enum: ["name", "property"], default: "name" },
    key: { type: String, required: true },
    content: { type: String, required: true },
  },
  { _id: false },
);

const FaqSchema = new Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false },
);

const HowToStepSchema = new Schema(
  {
    name: { type: String, required: true },
    text: { type: String, required: true },
    imageId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
  },
  { _id: false },
);

const SeoSchema = new Schema(
  {
    seoTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    focusKeyword: { type: String, default: "" },
    secondaryKeywords: { type: [String], default: [] },
    canonicalUrl: { type: String, default: "" },
    robotsIndex: { type: Boolean, default: true },
    robotsFollow: { type: Boolean, default: true },
    ogTitle: { type: String, default: "" },
    ogDescription: { type: String, default: "" },
    ogImageId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    twitterCard: { type: String, enum: TWITTER_CARDS, default: "summary_large_image" },
    twitterTitle: { type: String, default: "" },
    twitterDescription: { type: String, default: "" },
    breadcrumbEnabled: { type: Boolean, default: true },
    customMetaTags: { type: [MetaTagSchema], default: [] },
  },
  { _id: false },
);

const AiSeoSchema = new Schema(
  {
    aiSummary: { type: String, default: "", maxlength: 300 },
    keyTakeaways: { type: [String], default: [] },
    faqs: { type: [FaqSchema], default: [] },
    mainEntity: { type: EntitySchema, default: null },
    about: { type: [EntitySchema], default: [] },
    mentions: { type: [EntitySchema], default: [] },
    targetCountry: { type: String, default: DEFAULT_AI_CONTEXT.targetCountry },
    targetLanguage: { type: String, default: DEFAULT_AI_CONTEXT.targetLanguage },
    targetAudience: { type: String, default: DEFAULT_AI_CONTEXT.targetAudience },
    contentType: { type: String, enum: CONTENT_TYPES, default: DEFAULT_AI_CONTEXT.contentType },
    contentIntent: { type: String, enum: CONTENT_INTENTS, default: DEFAULT_AI_CONTEXT.contentIntent },
  },
  { _id: false },
);

const SchemaExtrasSchema = new Schema(
  {
    howToSteps: { type: [HowToStepSchema], default: [] },
    video: {
      type: new Schema(
        {
          url: { type: String, default: "" },
          embedUrl: { type: String, default: "" },
          name: { type: String, default: "" },
          description: { type: String, default: "" },
          thumbnailId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
          uploadDate: { type: Date, default: null },
          duration: { type: String, default: "" }, // ISO 8601, e.g. PT4M13S
        },
        { _id: false },
      ),
      default: null,
    },
    review: {
      type: new Schema(
        {
          itemName: { type: String, default: "" },
          itemType: { type: String, default: "Product" },
          ratingValue: { type: Number, default: null },
          bestRating: { type: Number, default: 5 },
          pros: { type: [String], default: [] },
          cons: { type: [String], default: [] },
        },
        { _id: false },
      ),
      default: null,
    },
    product: {
      type: new Schema(
        {
          name: { type: String, default: "" },
          brand: { type: String, default: "" },
          sku: { type: String, default: "" },
          priceRange: { type: String, default: "" },
        },
        { _id: false },
      ),
      default: null,
    },
    speakableEnabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const ScoresSchema = new Schema(
  {
    seo: { type: Number, default: 0 },
    aeo: { type: Number, default: 0 },
    geo: { type: Number, default: 0 },
    readability: { type: Number, default: 0 },
    checklist: { type: Schema.Types.Mixed, default: [] },
    computedAt: { type: Date, default: null },
  },
  { _id: false },
);

const PostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    excerpt: { type: String, default: "" },
    /** Tiptap/ProseMirror JSON document */
    content: { type: Schema.Types.Mixed, default: { type: "doc", content: [] } },
    /** Sanitised HTML rendered at save time (Shiki-highlighted, heading ids applied) */
    contentHtml: { type: String, default: "" },
    /** Plain text copy for search, word count and scoring */
    contentText: { type: String, default: "" },
    featuredImageId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    featuredImageAlt: { type: String, default: "" },
    featuredImageCaption: { type: String, default: "" },
    featuredImageTitle: { type: String, default: "" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    tags: { type: [{ type: Schema.Types.ObjectId, ref: "Tag" }], default: [] },
    authorId: { type: Schema.Types.ObjectId, ref: "Author", required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "Author", default: null },
    createdById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: POST_STATUSES, default: "DRAFT", required: true },
    publishedAt: { type: Date, default: null },
    scheduledFor: { type: Date, default: null },
    /** Public "Updated" date. Only moves when an edit is flagged as significant. */
    modifiedAt: { type: Date, default: null },
    lastReviewedAt: { type: Date, default: null },
    readingTimeMinutes: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    seo: { type: SeoSchema, default: () => ({}) },
    ai: { type: AiSeoSchema, default: () => ({}) },
    schemaExtras: { type: SchemaExtrasSchema, default: () => ({}) },
    scores: { type: ScoresSchema, default: () => ({}) },
    /** Every media id the post references (featured, OG, content, HowTo, video thumbnail); for usage checks. */
    mediaIds: { type: [{ type: Schema.Types.ObjectId, ref: "Media" }], default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false },
);

PostSchema.index({ slug: 1 }, { unique: true });
PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ status: 1, scheduledFor: 1 });
PostSchema.index({ categoryId: 1, status: 1, publishedAt: -1 });
PostSchema.index({ tags: 1, status: 1, publishedAt: -1 });
PostSchema.index({ authorId: 1, status: 1, publishedAt: -1 });
PostSchema.index({ deletedAt: 1, updatedAt: -1 });
PostSchema.index({ mediaIds: 1 });
PostSchema.index(
  { title: "text", excerpt: "text", contentText: "text" },
  { weights: { title: 10, excerpt: 4, contentText: 1 }, name: "post_text_search", default_language: "english" },
);

export type PostDoc = InferSchemaType<typeof PostSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Post: Model<PostDoc> = (models.Post as Model<PostDoc>) || model<PostDoc>("Post", PostSchema);

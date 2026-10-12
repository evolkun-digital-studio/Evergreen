import "server-only";
import mongoose, { type InferSchemaType, type Model, type Types } from "mongoose";
import {
  INDEXING_ACTIONS,
  INDEXING_ENGINES,
  INDEXING_STATUSES,
  LINK_TYPES,
  REDIRECT_CODES,
} from "@/lib/cms/constants";

const { Schema, model, models } = mongoose;

// Unbounded / operational data lives outside the Post document.

const PostRevisionSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reason: { type: String, enum: ["autosave", "manual", "publish", "restore"], default: "manual" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
PostRevisionSchema.index({ postId: 1, createdAt: -1 });

const RedirectSchema = new Schema(
  {
    fromPath: { type: String, required: true, trim: true },
    toPath: { type: String, required: true, trim: true },
    statusCode: { type: Number, enum: REDIRECT_CODES, default: 301 },
    hits: { type: Number, default: 0 },
    lastHitAt: { type: Date, default: null },
    /** true when created automatically by a slug change */
    automatic: { type: Boolean, default: false },
  },
  { timestamps: true },
);
RedirectSchema.index({ fromPath: 1 }, { unique: true });

const LinkCheckSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    url: { type: String, required: true },
    type: { type: String, enum: LINK_TYPES, required: true },
    statusCode: { type: Number, default: null },
    error: { type: String, default: "" },
    lastCheckedAt: { type: Date, default: null },
    isBroken: { type: Boolean, default: false },
  },
  { timestamps: true },
);
LinkCheckSchema.index({ postId: 1, url: 1 }, { unique: true });
LinkCheckSchema.index({ isBroken: 1, lastCheckedAt: -1 });

const IndexingLogSchema = new Schema(
  {
    url: { type: String, required: true },
    engine: { type: String, enum: INDEXING_ENGINES, required: true },
    action: { type: String, enum: INDEXING_ACTIONS, required: true },
    status: { type: String, enum: INDEXING_STATUSES, default: "PENDING" },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: null },
    responseCode: { type: Number, default: null },
    response: { type: String, default: "" },
  },
  { timestamps: true },
);
IndexingLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
IndexingLogSchema.index({ status: 1, nextAttemptAt: 1 });

/** Fixed-window counters for login throttling; documents expire on their own. */
const RateLimitSchema = new Schema({
  key: { type: String, required: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
RateLimitSchema.index({ key: 1 }, { unique: true });
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PostRevisionDoc = InferSchemaType<typeof PostRevisionSchema> & { _id: Types.ObjectId; createdAt: Date };
export type RedirectDoc = InferSchemaType<typeof RedirectSchema> & { _id: Types.ObjectId };
export type LinkCheckDoc = InferSchemaType<typeof LinkCheckSchema> & { _id: Types.ObjectId };
export type IndexingLogDoc = InferSchemaType<typeof IndexingLogSchema> & { _id: Types.ObjectId; createdAt: Date };
type RateLimitDoc = InferSchemaType<typeof RateLimitSchema> & { _id: Types.ObjectId };

export const PostRevision: Model<PostRevisionDoc> =
  (models.PostRevision as Model<PostRevisionDoc>) || model<PostRevisionDoc>("PostRevision", PostRevisionSchema);
export const Redirect: Model<RedirectDoc> =
  (models.Redirect as Model<RedirectDoc>) || model<RedirectDoc>("Redirect", RedirectSchema);
export const LinkCheck: Model<LinkCheckDoc> =
  (models.LinkCheck as Model<LinkCheckDoc>) || model<LinkCheckDoc>("LinkCheck", LinkCheckSchema);
export const IndexingLog: Model<IndexingLogDoc> =
  (models.IndexingLog as Model<IndexingLogDoc>) || model<IndexingLogDoc>("IndexingLog", IndexingLogSchema);
export const RateLimit: Model<RateLimitDoc> =
  (models.RateLimit as Model<RateLimitDoc>) || model<RateLimitDoc>("RateLimit", RateLimitSchema);

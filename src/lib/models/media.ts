import "server-only";
import mongoose, { type InferSchemaType, type Model, type Types } from "mongoose";

const { Schema, model, models } = mongoose;

/**
 * variants = { avif: [{ width, key, url, size }], webp: [...], original: [...] }
 * Each entry is one responsive width; `original` keeps the source format.
 */
const MediaSchema = new Schema(
  {
    originalName: { type: String, required: true },
    storageKey: { type: String, required: true },
    storageDriver: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    sizeBytes: { type: Number, default: 0 },
    variants: { type: Schema.Types.Mixed, default: {} },
    blurDataURL: { type: String, default: "" },
    alt: { type: String, default: "" },
    title: { type: String, default: "" },
    caption: { type: String, default: "" },
    description: { type: String, default: "" },
    uploadedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

MediaSchema.index({ deletedAt: 1, createdAt: -1 });
MediaSchema.index({ originalName: "text", alt: "text", title: "text" });

export type { MediaVariant, MediaVariants } from "@/lib/media/types";
export type MediaDoc = InferSchemaType<typeof MediaSchema> & { _id: Types.ObjectId };

export const Media: Model<MediaDoc> = (models.Media as Model<MediaDoc>) || model<MediaDoc>("Media", MediaSchema);

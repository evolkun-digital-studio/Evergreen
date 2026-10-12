import "server-only";
import mongoose, { type InferSchemaType, type Model, type Types } from "mongoose";

const { Schema, model, models } = mongoose;

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    seoTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    ogImageId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ parentId: 1, sortOrder: 1 });

const TagSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
  },
  { timestamps: true },
);
TagSchema.index({ slug: 1 }, { unique: true });

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & { _id: Types.ObjectId };
export type TagDoc = InferSchemaType<typeof TagSchema> & { _id: Types.ObjectId };

export const Category: Model<CategoryDoc> =
  (models.Category as Model<CategoryDoc>) || model<CategoryDoc>("Category", CategorySchema);
export const Tag: Model<TagDoc> = (models.Tag as Model<TagDoc>) || model<TagDoc>("Tag", TagSchema);

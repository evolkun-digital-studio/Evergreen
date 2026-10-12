import "server-only";
import mongoose, { type InferSchemaType, type Model, type Types } from "mongoose";

const { Schema, model, models } = mongoose;

const AuthorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    bio: { type: String, default: "" },
    avatarId: { type: Schema.Types.ObjectId, ref: "Media", default: null },
    jobTitle: { type: String, default: "" },
    /** Rendered as Person.knowsAbout */
    expertise: { type: [String], default: [] },
    /** LinkedIn, X, personal website… rendered as Person.sameAs */
    sameAs: { type: [String], default: [] },
    credentials: { type: String, default: "" },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

AuthorSchema.index({ slug: 1 }, { unique: true });

export type AuthorDoc = InferSchemaType<typeof AuthorSchema> & { _id: Types.ObjectId };
export const Author: Model<AuthorDoc> =
  (models.Author as Model<AuthorDoc>) || model<AuthorDoc>("Author", AuthorSchema);

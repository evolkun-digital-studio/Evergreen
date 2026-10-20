import "server-only";
import mongoose, { type InferSchemaType, type Model, type Types } from "mongoose";

const { Schema, model, models } = mongoose;

const LetterheadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    referenceNumber: { type: String, default: "", trim: true, maxlength: 80 },
    date: { type: String, required: true, maxlength: 40 },
    recipientName: { type: String, default: "", trim: true, maxlength: 160 },
    recipientAddress: { type: String, default: "", trim: true, maxlength: 1000 },
    subject: { type: String, default: "", trim: true, maxlength: 240 },
    bodyHtml: { type: String, default: "", maxlength: 200000 },
    closing: { type: String, default: "Sincerely,", trim: true, maxlength: 120 },
    authorizedName: { type: String, default: "", trim: true, maxlength: 160 },
    designation: { type: String, default: "", trim: true, maxlength: 160 },
    signatureKey: { type: String, default: null },
    signatureMimeType: { type: String, default: null },
    signatureStorageDriver: { type: String, default: "local" },
    signatureWidth: { type: Number, default: 150, min: 80, max: 260 },
    paragraphSpacing: { type: Number, default: 12, enum: [8, 12, 16, 24] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

LetterheadSchema.index({ updatedAt: -1 });

export type LetterheadDoc = InferSchemaType<typeof LetterheadSchema> & { _id: Types.ObjectId };
export const Letterhead: Model<LetterheadDoc> =
  (models.Letterhead as Model<LetterheadDoc>) || model<LetterheadDoc>("Letterhead", LetterheadSchema);

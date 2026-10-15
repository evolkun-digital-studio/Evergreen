import "server-only";
import mongoose, { type InferSchemaType, type Model, type Types } from "mongoose";
import { ROLES } from "@/lib/cms/constants";
import { DOCUMENT_CATEGORIES } from "@/lib/documents/constants";

const { Schema, model, models } = mongoose;

/** A private file in the Documents library. `fileKey` points into private storage, never /public. */
const DocumentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, enum: DOCUMENT_CATEGORIES, default: "Other", required: true },
    fileKey: { type: String, required: true },
    storageDriver: { type: String, required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    visibleToRoles: { type: [{ type: String, enum: ROLES }], default: ["ADMIN", "EDITOR", "VIEWER"] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

DocumentSchema.index({ active: 1, category: 1, title: 1 });

/** One row per view or download of a document. */
const DocumentAccessSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true },
  action: { type: String, enum: ["view", "download"], required: true },
  at: { type: Date, default: Date.now },
});

DocumentAccessSchema.index({ documentId: 1, at: -1 });

export type DocumentDoc = InferSchemaType<typeof DocumentSchema> & { _id: Types.ObjectId };
export type DocumentAccessDoc = InferSchemaType<typeof DocumentAccessSchema> & { _id: Types.ObjectId };

// Exported as CompanyDocument so it doesn't shadow the DOM's global `Document` type.
export const CompanyDocument: Model<DocumentDoc> =
  (models.Document as Model<DocumentDoc>) || model<DocumentDoc>("Document", DocumentSchema);
export const DocumentAccess: Model<DocumentAccessDoc> =
  (models.DocumentAccess as Model<DocumentAccessDoc>) || model<DocumentAccessDoc>("DocumentAccess", DocumentAccessSchema);

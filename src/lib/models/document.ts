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

/** One row per view or download of a document. Staff views carry `userId`; grant views carry `requestId`. */
const DocumentAccessSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  requestId: { type: Schema.Types.ObjectId, ref: "DocumentAccessRequest", default: null },
  email: { type: String, required: true },
  action: { type: String, enum: ["view", "download"], required: true },
  at: { type: Date, default: Date.now },
});

DocumentAccessSchema.index({ documentId: 1, at: -1 });

/** A visitor's request for documents. Approval attaches a grant whose emailed token is stored only as a hash. */
const DocumentAccessRequestSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    company: { type: String, default: "", trim: true },
    purpose: { type: String, default: "", trim: true },
    requested: {
      scope: { type: String, enum: ["all", "selected"], default: "all" },
      documentIds: { type: [Schema.Types.ObjectId], default: [] },
      /** Document types the visitor ticked, and anything they typed about what they are after. */
      categories: { type: [String], enum: DOCUMENT_CATEGORIES, default: [] },
      details: { type: String, default: "", trim: true },
    },
    status: { type: String, enum: ["pending", "approved", "rejected", "revoked"], default: "pending", required: true },
    grant: {
      type: new Schema(
        {
          scope: { type: String, enum: ["all", "selected"], required: true },
          documentIds: { type: [Schema.Types.ObjectId], default: [] },
          tokenHash: { type: String, required: true },
          expiresAt: { type: Date, required: true },
          approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
          approvedAt: { type: Date, required: true },
          lastEmailedAt: { type: Date, default: null },
        },
        { _id: false },
      ),
      default: null,
    },
    decisionNote: { type: String, default: "" },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

DocumentAccessRequestSchema.index({ status: 1, createdAt: -1 });
DocumentAccessRequestSchema.index({ email: 1, createdAt: -1 });

export type DocumentDoc = InferSchemaType<typeof DocumentSchema> & { _id: Types.ObjectId };
export type DocumentAccessDoc = InferSchemaType<typeof DocumentAccessSchema> & { _id: Types.ObjectId };
export type DocumentAccessRequestDoc = InferSchemaType<typeof DocumentAccessRequestSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

// Exported as CompanyDocument so it doesn't shadow the DOM's global `Document` type.
export const CompanyDocument: Model<DocumentDoc> =
  (models.Document as Model<DocumentDoc>) || model<DocumentDoc>("Document", DocumentSchema);
export const DocumentAccess: Model<DocumentAccessDoc> =
  (models.DocumentAccess as Model<DocumentAccessDoc>) || model<DocumentAccessDoc>("DocumentAccess", DocumentAccessSchema);
export const DocumentAccessRequest: Model<DocumentAccessRequestDoc> =
  (models.DocumentAccessRequest as Model<DocumentAccessRequestDoc>) ||
  model<DocumentAccessRequestDoc>("DocumentAccessRequest", DocumentAccessRequestSchema);

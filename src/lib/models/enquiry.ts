import "server-only";
import mongoose, { type InferSchemaType, type Model } from "mongoose";

const { Schema, model, models } = mongoose;

const EnquirySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    company: { type: String, default: "", trim: true },
    service: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["new", "handled"], default: "new" },
    source: { type: String, default: "contact-form" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true, collection: "enquiries" },
);
EnquirySchema.index({ createdAt: -1 });
EnquirySchema.index({ status: 1, createdAt: -1 });

export type EnquiryDoc = InferSchemaType<typeof EnquirySchema>;
export const Enquiry: Model<EnquiryDoc> = (models.Enquiry as Model<EnquiryDoc>) ?? model<EnquiryDoc>("Enquiry", EnquirySchema);

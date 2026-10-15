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
    status: { type: String, enum: ["new", "contacted", "qualified", "closed", "handled"], default: "new" },
    source: { type: String, enum: ["pickup", "contact", "epr-calculator", "contact-form"], default: "contact" },
    calculatorSnapshot: { type: Schema.Types.Mixed, default: null },
    notes: {
      type: [{ text: { type: String, required: true }, authorId: { type: Schema.Types.ObjectId, ref: "User", default: null }, createdAt: { type: Date, default: Date.now } }],
      default: [],
    },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true, collection: "enquiries" },
);
EnquirySchema.index({ createdAt: -1 });
EnquirySchema.index({ status: 1, createdAt: -1 });
EnquirySchema.index({ source: 1, createdAt: -1 });

export type EnquiryDoc = InferSchemaType<typeof EnquirySchema>;
export const Enquiry: Model<EnquiryDoc> = (models.Enquiry as Model<EnquiryDoc>) ?? model<EnquiryDoc>("Enquiry", EnquirySchema);

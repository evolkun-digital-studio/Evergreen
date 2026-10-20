import "server-only";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Letterhead, type LetterheadDoc } from "@/lib/models";
import type { LetterheadRecord } from "@/lib/letterhead/types";

export function letterheadSignatureUrl(key: string | null | undefined): string | null {
  return key ? `/api/admin/letterheads/signature?key=${encodeURIComponent(key)}` : null;
}

export function toLetterheadRecord(doc: LetterheadDoc | (LetterheadDoc & { createdAt: Date; updatedAt: Date })): LetterheadRecord {
  return {
    id: doc._id.toString(),
    name: doc.name,
    referenceNumber: doc.referenceNumber ?? "",
    date: doc.date,
    recipientName: doc.recipientName ?? "",
    recipientAddress: doc.recipientAddress ?? "",
    subject: doc.subject ?? "",
    bodyHtml: doc.bodyHtml ?? "",
    closing: doc.closing ?? "Sincerely,",
    authorizedName: doc.authorizedName ?? "",
    designation: doc.designation ?? "",
    signatureKey: doc.signatureKey ?? null,
    signatureMimeType: doc.signatureMimeType ?? null,
    signatureUrl: letterheadSignatureUrl(doc.signatureKey),
    signatureWidth: doc.signatureWidth ?? 150,
    paragraphSpacing: doc.paragraphSpacing ?? 12,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export async function listLetterheads(): Promise<LetterheadRecord[]> {
  await connectDB();
  const docs = await Letterhead.find().sort({ updatedAt: -1 }).lean<LetterheadDoc[]>();
  return docs.map(toLetterheadRecord);
}

export async function findLetterhead(id: string): Promise<LetterheadDoc | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  return Letterhead.findById(id).lean<LetterheadDoc>();
}

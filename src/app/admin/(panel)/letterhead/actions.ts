"use server";

import mongoose from "mongoose";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { requireActionUser } from "@/lib/auth/session";
import { Letterhead } from "@/lib/models";
import { privateStorage, privateStorageFor } from "@/lib/letterhead/storage";
import { toLetterheadRecord } from "@/lib/data/letterheads";
import { runAction, UserFacingError } from "@/lib/actions";
import { logServerError } from "@/lib/log";

const signatureKey = z
  .string()
  .regex(/^letterheads\/signatures\/[a-zA-Z0-9._/-]+$/, "Invalid signature.")
  .nullable()
  .default(null);

const letterheadSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Enter a document name.").max(120),
  referenceNumber: z.string().trim().max(80).default(""),
  date: z.string().trim().min(1, "Choose a date.").max(40),
  recipientName: z.string().trim().max(160).default(""),
  recipientAddress: z.string().trim().max(1000).default(""),
  subject: z.string().trim().max(240).default(""),
  bodyHtml: z.string().max(200000).default(""),
  closing: z.string().trim().max(120).default("Sincerely,"),
  authorizedName: z.string().trim().max(160).default(""),
  designation: z.string().trim().max(160).default(""),
  signatureKey,
  signatureMimeType: z.enum(["image/png", "image/jpeg", "image/webp"]).nullable().default(null),
  signatureWidth: z.coerce.number().int().min(80).max(260).default(150),
  paragraphSpacing: z.coerce.number().int().refine((value) => [8, 12, 16, 24].includes(value), "Choose a valid paragraph spacing.").default(12),
});

const cleanBodyOptions: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h2", "h3", "blockquote"],
  allowedAttributes: { p: ["style"], h2: ["style"], h3: ["style"], blockquote: ["style"] },
  allowedStyles: {
    p: { "text-align": [/^(left|center|right|justify)$/] },
    h2: { "text-align": [/^(left|center|right|justify)$/] },
    h3: { "text-align": [/^(left|center|right|justify)$/] },
    blockquote: { "text-align": [/^(left|center|right|justify)$/] },
  },
};

function assertId(id: string | undefined) {
  if (id && !mongoose.isValidObjectId(id)) throw new UserFacingError("This letter no longer exists.");
}

async function removeSignatureIfUnused(key: string | null | undefined, storageDriver = "local") {
  if (!key) return;
  const stillUsed = await Letterhead.exists({ signatureKey: key });
  if (!stillUsed) await privateStorageFor(storageDriver).delete(key).catch((error: unknown) => logServerError("[letterhead] signature cleanup", error));
}

export async function saveLetterheadAction(input: unknown) {
  return runAction(async () => {
    const user = await requireActionUser("manageLetterheads");
    const data = letterheadSchema.parse(input);
    assertId(data.id);
    await connectDB();
    const bodyHtml = sanitizeHtml(data.bodyHtml, cleanBodyOptions);
    let doc = data.id ? await Letterhead.findById(data.id) : null;
    const oldSignature = doc?.signatureKey ?? null;
    const oldStorageDriver = doc?.signatureStorageDriver ?? "local";
    const values = {
      name: data.name,
      referenceNumber: data.referenceNumber,
      date: data.date,
      recipientName: data.recipientName,
      recipientAddress: data.recipientAddress,
      subject: data.subject,
      bodyHtml,
      closing: data.closing,
      authorizedName: data.authorizedName,
      designation: data.designation,
      signatureKey: data.signatureKey,
      signatureMimeType: data.signatureMimeType,
      signatureStorageDriver: data.signatureKey ? privateStorage().name : doc?.signatureStorageDriver ?? "local",
      signatureWidth: data.signatureWidth,
      paragraphSpacing: data.paragraphSpacing,
      updatedBy: new mongoose.Types.ObjectId(user.id),
    };
    if (doc) {
      Object.assign(doc, values);
      await doc.save();
    } else {
      doc = await Letterhead.create({ ...values, createdBy: new mongoose.Types.ObjectId(user.id) });
    }
    if (oldSignature && oldSignature !== data.signatureKey) await removeSignatureIfUnused(oldSignature, oldStorageDriver);
    return toLetterheadRecord(doc.toObject() as never);
  }, "Letter saved");
}

export async function duplicateLetterheadAction(id: string) {
  return runAction(async () => {
    const user = await requireActionUser("manageLetterheads");
    assertId(id);
    await connectDB();
    const source = await Letterhead.findById(id).lean();
    if (!source) throw new UserFacingError("This letter no longer exists.");
    const copy = await Letterhead.create({
      ...source,
      _id: undefined,
      name: `${source.name} copy`.slice(0, 120),
      createdBy: new mongoose.Types.ObjectId(user.id),
      updatedBy: new mongoose.Types.ObjectId(user.id),
      createdAt: undefined,
      updatedAt: undefined,
    });
    return toLetterheadRecord(copy.toObject() as never);
  }, "Letter duplicated");
}

export async function deleteLetterheadAction(id: string) {
  return runAction(async () => {
    await requireActionUser("manageLetterheads");
    assertId(id);
    await connectDB();
    const doc = await Letterhead.findByIdAndDelete(id).lean();
    if (!doc) return;
    await removeSignatureIfUnused(doc.signatureKey, doc.signatureStorageDriver ?? "local");
  }, "Letter deleted");
}

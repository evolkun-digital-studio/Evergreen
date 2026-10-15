"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { CompanyDocument, DocumentAccess } from "@/lib/models";
import { requireActionUser } from "@/lib/auth/session";
import { runAction, UserFacingError } from "@/lib/actions";
import { ROLES } from "@/lib/cms/constants";
import { DOCUMENT_CATEGORIES } from "@/lib/documents/constants";
import { privateStorageFor } from "@/lib/documents/storage";
import { listDocumentAccess } from "@/lib/data/documents";

const updateSchema = z.object({
  title: z.string().trim().min(2, "Enter a title").max(200),
  description: z.string().trim().max(1000).default(""),
  category: z.enum(DOCUMENT_CATEGORIES),
  visibleToRoles: z.array(z.enum(ROLES)).min(1, "Choose at least one role"),
});

function assertId(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new UserFacingError("Invalid document.");
}

export async function updateDocumentAction(id: string, input: unknown) {
  return runAction(async () => {
    await requireActionUser("manageDocuments");
    assertId(id);
    const data = updateSchema.parse(input);
    await connectDB();
    const res = await CompanyDocument.updateOne({ _id: id }, { $set: data });
    if (!res.matchedCount) throw new UserFacingError("This document no longer exists.");
    revalidatePath("/documents");
  }, "Document saved");
}

export async function setDocumentActiveAction(id: string, active: boolean) {
  return runAction(async () => {
    await requireActionUser("manageDocuments");
    assertId(id);
    await connectDB();
    await CompanyDocument.updateOne({ _id: id }, { $set: { active } });
    revalidatePath("/documents");
  }, active ? "Document activated" : "Document deactivated");
}

export async function deleteDocumentAction(id: string) {
  return runAction(async () => {
    await requireActionUser("manageDocuments");
    assertId(id);
    await connectDB();
    const doc = await CompanyDocument.findByIdAndDelete(id).lean();
    if (!doc) return;
    await DocumentAccess.deleteMany({ documentId: doc._id });
    await privateStorageFor(doc.storageDriver).delete(doc.fileKey).catch((e) => console.error("[documents] file not removed", e));
    revalidatePath("/documents");
  }, "Document deleted");
}

export async function documentAccessLogAction(id: string) {
  return runAction(async () => {
    await requireActionUser("manageDocuments");
    return listDocumentAccess(id);
  });
}

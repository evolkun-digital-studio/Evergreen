import "server-only";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { CompanyDocument, DocumentAccess, User, type DocumentDoc } from "@/lib/models";
import type { Role } from "@/lib/cms/constants";
import type { DocumentCategory } from "@/lib/documents/constants";

export type DocumentItem = {
  id: string;
  title: string;
  description: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  size: number;
  active: boolean;
  visibleToRoles: Role[];
  uploadedBy: string | null;
  updatedAt: string;
  createdAt: string;
};

export type DocumentAccessItem = { id: string; email: string; action: "view" | "download"; at: string };

type Lean = DocumentDoc & { createdAt: Date; updatedAt: Date };

function toItem(doc: Lean, uploaders = new Map<string, string>()): DocumentItem {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? "",
    category: doc.category as DocumentCategory,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    size: doc.size,
    active: doc.active,
    visibleToRoles: doc.visibleToRoles as Role[],
    uploadedBy: doc.uploadedBy ? (uploaders.get(doc.uploadedBy.toString()) ?? null) : null,
    updatedAt: doc.updatedAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
  };
}

/** Active documents the given role may see (the public /documents library). */
export async function listVisibleDocuments(role: Role): Promise<DocumentItem[]> {
  await connectDB();
  const docs = await CompanyDocument.find({ active: true, visibleToRoles: role }).sort({ category: 1, title: 1 }).lean<Lean[]>();
  return docs.map((d) => toItem(d));
}

/** Every document, including inactive ones (admin). */
export async function listAllDocuments(): Promise<DocumentItem[]> {
  await connectDB();
  const docs = await CompanyDocument.find().sort({ updatedAt: -1 }).lean<Lean[]>();
  const ids = [...new Set(docs.flatMap((d) => (d.uploadedBy ? [d.uploadedBy.toString()] : [])))];
  const users = await User.find({ _id: { $in: ids } }, { name: 1 }).lean<{ _id: mongoose.Types.ObjectId; name: string }[]>();
  return docs.map((d) => toItem(d, new Map(users.map((u) => [u._id.toString(), u.name]))));
}

/** The document a role may open, or null (unknown id, inactive, or not visible to that role). */
export async function findVisibleDocument(id: string, role: Role) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  return CompanyDocument.findOne({ _id: id, active: true, visibleToRoles: role }).lean<Lean>();
}

export async function listDocumentAccess(documentId: string, limit = 100): Promise<DocumentAccessItem[]> {
  if (!mongoose.isValidObjectId(documentId)) return [];
  await connectDB();
  const rows = await DocumentAccess.find({ documentId }).sort({ at: -1 }).limit(limit).lean();
  return rows.map((r) => ({ id: r._id.toString(), email: r.email, action: r.action as "view" | "download", at: r.at.toISOString() }));
}

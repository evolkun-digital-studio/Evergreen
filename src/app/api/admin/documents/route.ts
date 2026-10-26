import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { CompanyDocument } from "@/lib/models";
import { PermissionError, requireActionUser } from "@/lib/auth/session";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/documents/constants";
import { DocumentUploadError, readDocumentUpload } from "@/lib/documents/upload";
import { newDocumentKey, privateStorage, privateStorageFor } from "@/lib/documents/storage";
import { logServerError } from "@/lib/log";

// Multipart upload for the Documents library (a route handler, so 20 MB files aren't limited by
// the Server Action body size). Without `id` it creates a document; with `id` it replaces the file.
export async function POST(request: Request) {
  try {
    const user = await requireActionUser("manageDocuments");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
    const upload = await readDocumentUpload(file);
    const id = String(form.get("id") ?? "");

    await connectDB();
    const existing = id ? await CompanyDocument.findById(mongoose.isValidObjectId(id) ? id : null) : null;
    if (id && !existing) return NextResponse.json({ error: "This document no longer exists." }, { status: 404 });

    const storage = privateStorage();
    const fileKey = newDocumentKey(upload.ext);
    await storage.put(fileKey, upload.body, upload.mimeType);
    const fileFields = { fileKey, storageDriver: storage.name, fileName: upload.fileName, mimeType: upload.mimeType, size: upload.body.length, uploadedBy: user.id };

    if (existing) {
      const previous = { key: existing.fileKey, driver: existing.storageDriver };
      existing.set(fileFields);
      await existing.save();
      await privateStorageFor(previous.driver).delete(previous.key).catch((error) => logServerError("[documents] old file not removed", error));
    } else {
      const category = String(form.get("category") ?? "");
      await CompanyDocument.create({
        ...fileFields,
        title: upload.fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim().slice(0, 200) || "Untitled document",
        category: (DOCUMENT_CATEGORIES as readonly string[]).includes(category) ? (category as DocumentCategory) : "Other",
      });
    }
    revalidatePath("/documents");
    return NextResponse.json({ ok: true }, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof PermissionError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof DocumentUploadError) return NextResponse.json({ error: error.message }, { status: 422 });
    logServerError("[documents upload]", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

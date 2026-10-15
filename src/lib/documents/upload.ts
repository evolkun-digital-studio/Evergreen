import "server-only";
import { DOCUMENT_MAX_BYTES, DOCUMENT_TYPES } from "./constants";

export class DocumentUploadError extends Error {}

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** File signatures, so a renamed executable or HTML file can't pass as a PDF. */
function matchesSignature(mime: string, b: Buffer): boolean {
  if (mime === "application/pdf") return b.subarray(0, 5).toString("latin1") === "%PDF-";
  if (mime === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === "image/png") return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  // DOCX and XLSX are ZIP containers.
  return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
}

/** Validates an uploaded document by extension, size and content; returns its canonical type. */
export async function readDocumentUpload(file: File): Promise<{ body: Buffer; mimeType: string; ext: string; fileName: string }> {
  if (file.size === 0) throw new DocumentUploadError("The file is empty.");
  if (file.size > DOCUMENT_MAX_BYTES) throw new DocumentUploadError("File is larger than 20 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = EXT_TO_MIME[ext];
  if (!mimeType) throw new DocumentUploadError("Upload a PDF, JPG, PNG, DOCX or XLSX file.");
  const body = Buffer.from(await file.arrayBuffer());
  if (!matchesSignature(mimeType, body)) throw new DocumentUploadError("The file's contents don't match its extension.");
  const fileName = file.name.replace(/[\\/\r\n"]/g, "_").slice(0, 200);
  return { body, mimeType, ext: DOCUMENT_TYPES[mimeType].ext, fileName };
}

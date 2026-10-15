import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/cms/constants";
import { CompanyDocument, DocumentAccess, type DocumentDoc } from "@/lib/models";
import { findVisibleDocument } from "@/lib/data/documents";
import { privateStorageFor } from "@/lib/documents/storage";

// Serves private documents. Every request re-checks the session and role against the database;
// nothing here is cacheable by browsers, proxies or CDNs, and nothing is indexable.
const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};

const deny = (status: 401 | 403 | 404, message: string) =>
  new Response(message, { status, headers: { ...PRIVATE_HEADERS, "Content-Type": "text/plain; charset=utf-8" } });

/** RFC 6266 filename: ASCII fallback plus UTF-8 form. */
function disposition(type: "inline" | "attachment", fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(request: Request, ctx: RouteContext<"/api/documents/[id]/file">) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return deny(401, "Sign in to view this document.");
  if (!can.viewDocuments(user.role)) return deny(403, "You don't have access to documents.");

  const { id } = await ctx.params;
  // Managers can open inactive or restricted documents from the admin panel; everyone else only
  // sees active documents shared with their role. Unknown and hidden ids both look like 404.
  let doc: DocumentDoc | null;
  if (can.manageDocuments(user.role)) {
    if (!mongoose.isValidObjectId(id)) return deny(404, "Not found");
    await connectDB();
    doc = await CompanyDocument.findById(id).lean<DocumentDoc>();
  } else {
    doc = await findVisibleDocument(id, user.role);
  }
  if (!doc) return deny(404, "Not found");

  const file = await privateStorageFor(doc.storageDriver).get(doc.fileKey);
  if (!file) return deny(404, "Not found");

  const download = new URL(request.url).searchParams.get("download") === "1";
  await DocumentAccess.create({ documentId: doc._id, userId: user.id, email: user.email, action: download ? "download" : "view" });

  return new Response(file.body, {
    headers: {
      ...PRIVATE_HEADERS,
      "Content-Type": doc.mimeType,
      ...(file.size ? { "Content-Length": String(file.size) } : {}),
      "Content-Disposition": disposition(download ? "attachment" : "inline", doc.fileName),
      // PDFs open in the browser's own viewer, which a strict CSP would break; images get one.
      ...(doc.mimeType.startsWith("image/") ? { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'" } : {}),
      "Referrer-Policy": "no-referrer",
    },
  });
}

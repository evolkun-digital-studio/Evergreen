import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Media } from "@/lib/models";
import { PermissionError, requireActionUser } from "@/lib/auth/session";
import { maxUploadBytes, processUpload, UploadError } from "@/lib/media/process";
import { toMediaItem } from "@/lib/data/media";
import { logServerError } from "@/lib/log";

// Multipart upload endpoint for the Media Library. A route handler (not a Server Action) so
// large files aren't constrained by the Server Action body limit. One file per request; the
// client uploads in parallel and shows per-file progress.
export async function POST(request: Request) {
  try {
    const user = await requireActionUser("manageMedia");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
    if (file.size > maxUploadBytes()) {
      return NextResponse.json({ error: `File is larger than ${process.env.MEDIA_MAX_UPLOAD_MB || 10} MB.` }, { status: 413 });
    }

    const processed = await processUpload(Buffer.from(await file.arrayBuffer()), file.name, file.type);
    await connectDB();
    const doc = await Media.create({
      ...processed,
      originalName: file.name.slice(0, 200),
      alt: String(form.get("alt") ?? "").slice(0, 300),
      title: file.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").slice(0, 200),
      uploadedById: user.id,
    });
    return NextResponse.json({ media: toMediaItem(doc.toObject()) }, { status: 201 });
  } catch (error) {
    if (error instanceof PermissionError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: 422 });
    logServerError("[media upload]", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

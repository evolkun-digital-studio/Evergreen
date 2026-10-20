import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireActionUser, PermissionError } from "@/lib/auth/session";
import { newLetterheadSignatureKey, privateStorage } from "@/lib/letterhead/storage";
import { LetterheadUploadError, readSignatureUpload } from "@/lib/letterhead/upload";

function isSafeKey(key: string) {
  return key.startsWith("letterheads/signatures/") && !key.includes("..") && !key.includes("\\");
}

export async function POST(request: Request) {
  try {
    await requireActionUser("manageLetterheads");
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a signature image." }, { status: 400 });
    const upload = await readSignatureUpload(file);
    const key = newLetterheadSignatureKey(upload.ext);
    const storage = privateStorage();
    await storage.put(key, upload.body, upload.mimeType);
    return NextResponse.json({ key, mimeType: upload.mimeType, url: `/api/admin/letterheads/signature?key=${encodeURIComponent(key)}` });
  } catch (error) {
    if (error instanceof LetterheadUploadError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof PermissionError) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("[letterhead signature upload]", error);
    return NextResponse.json({ error: "Signature upload failed. Please try again." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await requireActionUser("manageLetterheads");
    const key = new URL(request.url).searchParams.get("key") ?? "";
    if (!isSafeKey(key)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    const asset = await privateStorage().get(key);
    if (!asset) return NextResponse.json({ error: "Signature not found." }, { status: 404 });
    return new Response(asset.body, { headers: { "Content-Type": key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "image/jpeg", "Cache-Control": "private, max-age=3600" } });
  } catch (error) {
    if (error instanceof PermissionError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof mongoose.Error) return NextResponse.json({ error: "Signature unavailable." }, { status: 404 });
    return NextResponse.json({ error: "Signature unavailable." }, { status: 404 });
  }
}

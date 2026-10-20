import "server-only";

const SIGNATURE_MIMES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

export class LetterheadUploadError extends Error {}

export async function readSignatureUpload(file: File): Promise<{ body: Buffer; mimeType: string; ext: string }> {
  if (file.size === 0) throw new LetterheadUploadError("The signature file is empty.");
  if (file.size > 2 * 1024 * 1024) throw new LetterheadUploadError("Signature images must be 2 MB or smaller.");
  const mimeType = SIGNATURE_MIMES.has(file.type) ? file.type : "";
  const ext = SIGNATURE_MIMES.get(mimeType);
  if (!mimeType || !ext) throw new LetterheadUploadError("Upload a PNG, JPG or WebP signature image.");
  const body = Buffer.from(await file.arrayBuffer());
  const valid =
    (mimeType === "image/png" && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (mimeType === "image/jpeg" && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) ||
    (mimeType === "image/webp" && body.subarray(0, 4).toString("ascii") === "RIFF" && body.subarray(8, 12).toString("ascii") === "WEBP");
  if (!valid) throw new LetterheadUploadError("The file contents do not match its image type.");
  return { body, mimeType, ext };
}

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Signed, expiring draft-preview links: /blog/preview/<id>?exp=<unix>&token=<hmac>.

const TTL_SECONDS = 60 * 60 * 24; // 24 hours

function secret(): string {
  const s = process.env.PREVIEW_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error("Set PREVIEW_SECRET or AUTH_SECRET to sign preview links.");
  return s;
}

const sign = (postId: string, exp: number) => createHmac("sha256", secret()).update(`preview:${postId}:${exp}`).digest("base64url");

export function createPreviewPath(postId: string): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  return `/blog/preview/${postId}?exp=${exp}&token=${sign(postId, exp)}`;
}

export function verifyPreviewToken(postId: string, exp: string | undefined, token: string | undefined): boolean {
  const expiry = Number(exp);
  if (!token || !Number.isFinite(expiry) || expiry < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(postId, expiry));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

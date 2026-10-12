import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Cron endpoints accept `Authorization: Bearer <CRON_SECRET>` (what Vercel Cron sends). */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401, headers: { "X-Robots-Tag": "noindex" } });

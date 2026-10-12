import "server-only";
import { RateLimit } from "@/lib/models";

/**
 * Fixed-window counter stored in MongoDB, so limits hold across serverless instances.
 * Expired windows are removed by the TTL index on `expiresAt`.
 */
export async function hitRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = new Date();
  // Start a fresh window if the previous one has expired but the TTL monitor hasn't removed it yet.
  await RateLimit.deleteOne({ key, expiresAt: { $lte: now } });
  const doc = await RateLimit.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + windowSeconds * 1000) } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  const count = doc?.count ?? 1;
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

export async function resetRateLimit(key: string) {
  await RateLimit.deleteOne({ key });
}

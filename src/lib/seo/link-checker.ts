import "server-only";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { LinkCheck, Media, Post } from "@/lib/models";
import { SITE_URL } from "@/lib/cms/constants";
import { absoluteUrl } from "@/lib/seo/metadata";
import { defined } from "@/lib/utils";

type LinkType = "internal" | "external" | "image";
type Found = { url: string; type: LinkType };
type Result = { statusCode: number | null; error: string; isBroken: boolean };

const USER_AGENT = `Evergreen-LinkChecker/1.0 (+${SITE_URL})`;
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 5;
const siteHost = new URL(SITE_URL).host;

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Links and images referenced by a post's rendered HTML (plus its featured image). */
export function extractLinks(html: string, featuredUrl?: string | null): Found[] {
  const out = new Map<string, LinkType>();
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    const href = decode(m[1]);
    if (href.startsWith("#") || /^(mailto|tel):/i.test(href)) continue;
    const url = absoluteUrl(href);
    let type: LinkType = "external";
    try {
      type = new URL(url).host === siteHost ? "internal" : "external";
    } catch {
      continue;
    }
    if (!out.has(url)) out.set(url, type);
  }
  for (const m of html.matchAll(/<img\s[^>]*src="([^"]+)"/g)) {
    const src = decode(m[1]);
    if (src.startsWith("data:")) continue;
    out.set(absoluteUrl(src), "image");
  }
  if (featuredUrl) out.set(absoluteUrl(featuredUrl), "image");
  return [...out].map(([url, type]) => ({ url, type }));
}

async function probe(url: string): Promise<Result> {
  const attempt = async (method: "HEAD" | "GET") => {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (method === "GET") await res.body?.cancel();
    return res.status;
  };
  try {
    let status = await attempt("HEAD");
    // Many servers mishandle HEAD; confirm failures with GET before reporting them.
    if (status >= 400) status = await attempt("GET");
    return { statusCode: status, error: "", isBroken: status >= 400 };
  } catch (error) {
    const e = error as Error;
    const message = e.name === "TimeoutError" ? `Timed out after ${TIMEOUT_MS / 1000}s` : (e.cause as Error)?.message || e.message;
    return { statusCode: null, error: message.slice(0, 300), isBroken: true };
  }
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

/** Checks every link and image in published posts (or one post). Results land in LinkCheck. */
export async function runLinkScan(postId?: string) {
  await connectDB();
  const filter: Record<string, unknown> = { status: "PUBLISHED", deletedAt: null };
  if (postId) filter._id = new mongoose.Types.ObjectId(postId);
  const posts = await Post.find(filter).select({ contentHtml: 1, featuredImageId: 1 }).lean();
  const featured = await Media.find({ _id: { $in: posts.map((p) => p.featuredImageId).filter(defined) } }).select({ url: 1 }).lean();
  const featuredUrl = new Map(featured.map((m) => [m._id.toString(), m.url]));

  const perPost = posts.map((p) => ({
    postId: p._id,
    links: extractLinks(p.contentHtml ?? "", p.featuredImageId ? featuredUrl.get(p.featuredImageId.toString()) : null),
  }));

  // Each distinct URL is fetched once per scan, however many posts use it.
  const unique = [...new Set(perPost.flatMap((p) => p.links.map((l) => l.url)))];
  const results = new Map<string, Result>();
  await pool(unique, CONCURRENCY, async (url) => {
    results.set(url, await probe(url));
  });

  const now = new Date();
  for (const { postId: id, links } of perPost) {
    if (links.length) {
      await LinkCheck.bulkWrite(
        links.map((l) => ({
          updateOne: {
            filter: { postId: id, url: l.url },
            update: { $set: { type: l.type, lastCheckedAt: now, ...results.get(l.url)! } },
            upsert: true,
          },
        })),
      );
    }
    // Forget links that were removed from the post.
    await LinkCheck.deleteMany({ postId: id, url: { $nin: links.map((l) => l.url) } });
  }
  if (!postId) await LinkCheck.deleteMany({ postId: { $nin: posts.map((p) => p._id) } });

  const broken = [...results.values()].filter((r) => r.isBroken).length;
  return { posts: posts.length, checked: unique.length, broken };
}

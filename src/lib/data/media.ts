import "server-only";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Author, Category, Media, Post, SiteSettings, type MediaDoc } from "@/lib/models";
import type { MediaItem, MediaVariants } from "@/lib/media/types";

type LeanMedia = Partial<MediaDoc> & { _id: mongoose.Types.ObjectId };

export function toMediaItem(m: LeanMedia): MediaItem {
  return {
    id: m._id.toString(),
    url: m.url ?? "",
    mimeType: m.mimeType ?? "",
    width: m.width ?? 0,
    height: m.height ?? 0,
    variants: (m.variants ?? {}) as MediaVariants,
    blurDataURL: m.blurDataURL ?? "",
    alt: m.alt ?? "",
    originalName: m.originalName ?? "",
    title: m.title ?? "",
    caption: m.caption ?? "",
    description: m.description ?? "",
    sizeBytes: m.sizeBytes ?? 0,
    storageDriver: m.storageDriver ?? "local",
    createdAt: (m as { createdAt?: Date }).createdAt?.toISOString() ?? "",
  };
}

export type MediaQuery = {
  q?: string;
  type?: "all" | "image" | "svg" | "gif";
  unused?: boolean;
  missingAlt?: boolean;
  page?: number;
  perPage?: number;
};

export async function listMedia({ q, type = "all", unused, missingAlt, page = 1, perPage = 40 }: MediaQuery) {
  await connectDB();
  const filter: Record<string, unknown> = { deletedAt: null };
  if (q?.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ originalName: rx }, { alt: rx }, { title: rx }, { caption: rx }];
  }
  if (type === "svg") filter.mimeType = "image/svg+xml";
  else if (type === "gif") filter.mimeType = "image/gif";
  else if (type === "image") filter.mimeType = { $nin: ["image/svg+xml", "image/gif"] };
  if (missingAlt) filter.alt = "";
  if (unused) filter._id = { $nin: await usedMediaIds() };

  const [items, total] = await Promise.all([
    Media.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
    Media.countDocuments(filter),
  ]);
  return { items: items.map(toMediaItem), total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

async function usedMediaIds(): Promise<mongoose.Types.ObjectId[]> {
  const [fromPosts, fromAuthors, fromCategories, settings] = await Promise.all([
    Post.distinct("mediaIds", { deletedAt: null }),
    Author.distinct("avatarId"),
    Category.distinct("ogImageId"),
    SiteSettings.findOne({ key: "site" }).select({ logoId: 1, faviconId: 1, defaultOgImageId: 1 }).lean(),
  ]);
  return [
    ...fromPosts,
    ...fromAuthors,
    ...fromCategories,
    settings?.logoId,
    settings?.faviconId,
    settings?.defaultOgImageId,
  ].filter(Boolean) as mongoose.Types.ObjectId[];
}

export type MediaUsage = { kind: "post" | "author" | "category" | "settings"; id: string; label: string; href: string };

/** Everything that references a media item; deletion is blocked while this is non-empty. */
export async function findMediaUsage(mediaId: string): Promise<MediaUsage[]> {
  await connectDB();
  const id = new mongoose.Types.ObjectId(mediaId);
  const [posts, authors, categories, settings] = await Promise.all([
    Post.find({ mediaIds: id }).select({ title: 1, deletedAt: 1 }).lean(),
    Author.find({ avatarId: id }).select({ name: 1 }).lean(),
    Category.find({ ogImageId: id }).select({ name: 1 }).lean(),
    SiteSettings.findOne({ key: "site", $or: [{ logoId: id }, { faviconId: id }, { defaultOgImageId: id }] })
      .select({ _id: 1 })
      .lean(),
  ]);
  return [
    ...posts.map((p) => ({
      kind: "post" as const,
      id: p._id.toString(),
      label: p.deletedAt ? `${p.title} (in trash)` : p.title,
      href: `/admin/posts/${p._id}`,
    })),
    ...authors.map((a) => ({ kind: "author" as const, id: a._id.toString(), label: a.name, href: `/admin/authors/${a._id}` })),
    ...categories.map((c) => ({ kind: "category" as const, id: c._id.toString(), label: c.name, href: "/admin/categories" })),
    ...(settings ? [{ kind: "settings" as const, id: "site", label: "Site settings", href: "/admin/settings" }] : []),
  ];
}

/** Loads media referenced by a post for responsive rendering. */
export async function getMediaMap(ids: (string | mongoose.Types.ObjectId | null | undefined)[]): Promise<Map<string, MediaItem>> {
  const valid = [...new Set(ids.filter(Boolean).map(String))].filter((id) => mongoose.isValidObjectId(id));
  if (!valid.length) return new Map();
  await connectDB();
  const docs = await Media.find({ _id: { $in: valid } }).lean();
  return new Map(docs.map((d) => [d._id.toString(), toMediaItem(d)]));
}

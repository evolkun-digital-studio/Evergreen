import "server-only";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Author, Category, Post, Tag } from "@/lib/models";
import { POST_STATUSES, can, type PostStatus } from "@/lib/cms/constants";
import type { SessionUser } from "@/lib/auth/session";

export type PostListParams = {
  q?: string;
  status?: string;
  category?: string;
  author?: string;
  tag?: string;
  sort?: string;
  page?: string;
  view?: string;
};

export type PostRow = {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  category: string | null;
  author: string;
  seoScore: number;
  aeoScore: number;
  geoScore: number;
  wordCount: number;
  publishedAt: string | null;
  scheduledFor: string | null;
  updatedAt: string;
  editable: boolean;
};

export const SORTS = {
  updated: { updatedAt: -1 },
  published: { publishedAt: -1 },
  title: { title: 1 },
  score: { "scores.seo": -1 },
} as const;

const PER_PAGE = 20;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listAdminPosts(user: SessionUser, p: PostListParams) {
  await connectDB();
  const trash = p.view === "trash";
  const filter: Record<string, unknown> = { deletedAt: trash ? { $ne: null } : null };
  if (p.status && (POST_STATUSES as readonly string[]).includes(p.status)) filter.status = p.status;
  if (p.category && mongoose.isValidObjectId(p.category)) filter.categoryId = new mongoose.Types.ObjectId(p.category);
  if (p.author && mongoose.isValidObjectId(p.author)) filter.authorId = new mongoose.Types.ObjectId(p.author);
  if (p.tag && mongoose.isValidObjectId(p.tag)) filter.tags = new mongoose.Types.ObjectId(p.tag);
  if (p.q?.trim()) {
    const rx = new RegExp(escape(p.q.trim()), "i");
    filter.$or = [{ title: rx }, { slug: rx }, { "seo.focusKeyword": rx }];
  }

  const sort = SORTS[(p.sort as keyof typeof SORTS) ?? "updated"] ?? SORTS.updated;
  const page = Math.max(1, Number(p.page) || 1);

  const [docs, total, counts] = await Promise.all([
    Post.find(filter)
      .sort(sort)
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .select({ title: 1, slug: 1, status: 1, categoryId: 1, authorId: 1, createdById: 1, scores: 1, wordCount: 1, publishedAt: 1, scheduledFor: 1, updatedAt: 1 })
      .lean(),
    Post.countDocuments(filter),
    Post.aggregate<{ _id: { status: string; trashed: boolean }; n: number }>([
      { $group: { _id: { status: "$status", trashed: { $ne: ["$deletedAt", null] } }, n: { $sum: 1 } } },
    ]),
  ]);

  const [cats, authors] = await Promise.all([
    Category.find({ _id: { $in: docs.map((d) => d.categoryId).filter((x): x is mongoose.Types.ObjectId => Boolean(x)) } }).select({ name: 1 }).lean(),
    Author.find({ _id: { $in: docs.map((d) => d.authorId) } }).select({ name: 1 }).lean(),
  ]);
  const catName = new Map(cats.map((c) => [c._id.toString(), c.name]));
  const authorName = new Map(authors.map((a) => [a._id.toString(), a.name]));

  const rows: PostRow[] = docs.map((d) => {
    const own = d.createdById?.toString() === user.id || (user.authorId !== null && d.authorId.toString() === user.authorId);
    return {
      id: d._id.toString(),
      title: d.title,
      slug: d.slug,
      status: d.status as PostStatus,
      category: d.categoryId ? (catName.get(d.categoryId.toString()) ?? null) : null,
      author: authorName.get(d.authorId.toString()) ?? "—",
      seoScore: d.scores?.seo ?? 0,
      aeoScore: d.scores?.aeo ?? 0,
      geoScore: d.scores?.geo ?? 0,
      wordCount: d.wordCount ?? 0,
      publishedAt: d.publishedAt?.toISOString() ?? null,
      scheduledFor: d.scheduledFor?.toISOString() ?? null,
      updatedAt: d.updatedAt.toISOString(),
      editable: can.editAnyPost(user.role) || (own && d.status === "DRAFT"),
    };
  });

  const tally = { all: 0, trash: 0, DRAFT: 0, SCHEDULED: 0, PUBLISHED: 0, ARCHIVED: 0 } as Record<string, number>;
  for (const c of counts) {
    if (c._id.trashed) tally.trash += c.n;
    else {
      tally.all += c.n;
      tally[c._id.status] = (tally[c._id.status] ?? 0) + c.n;
    }
  }

  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PER_PAGE)), tally };
}

export async function loadPostFilterOptions() {
  await connectDB();
  const [categories, authors, tags] = await Promise.all([
    Category.find().sort({ name: 1 }).select({ name: 1 }).lean(),
    Author.find().sort({ name: 1 }).select({ name: 1 }).lean(),
    Tag.find().sort({ name: 1 }).limit(500).select({ name: 1 }).lean(),
  ]);
  const opt = (d: { _id: mongoose.Types.ObjectId; name: string }) => ({ id: d._id.toString(), name: d.name });
  return { categories: categories.map(opt), authors: authors.map(opt), tags: tags.map(opt) };
}

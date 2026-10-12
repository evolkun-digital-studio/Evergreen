import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock, FilePen, FileText, FolderTree, Globe, Tags } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { ListSkeleton, StatCardsSkeleton } from "@/components/admin/skeletons";
import { requirePageUser } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { Category, LinkCheck, Post, Tag } from "@/lib/models";

export const metadata: Metadata = { title: "Dashboard" };

const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default function DashboardPage({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <PageHeader title="Dashboard" description="An overview of the Evergreen website content." />
      <Suspense fallback={null}>
        <DeniedNotice searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<StatCardsSkeleton />}>
        <StatCards />
      </Suspense>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ListSkeleton title="Recent posts" />}>
          <RecentPosts />
        </Suspense>
        <Suspense fallback={<ListSkeleton title="Upcoming scheduled posts" />}>
          <UpcomingScheduled />
        </Suspense>
        <Suspense fallback={<ListSkeleton title="Low SEO score (below 60)" />}>
          <LowScorePosts />
        </Suspense>
        <Suspense fallback={<ListSkeleton title="Broken links" rows={2} />}>
          <BrokenLinksWidget />
        </Suspense>
        <div className="lg:col-span-2">
          <Suspense fallback={<ListSkeleton title="Stale posts (not updated in 12+ months)" />}>
            <StalePosts />
          </Suspense>
        </div>
      </div>
    </>
  );
}

async function DeniedNotice({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const { denied } = await searchParams;
  if (!denied) return null;
  return (
    <p role="alert" className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      Your role doesn&apos;t have access to that page.
    </p>
  );
}

async function StatCards() {
  await requirePageUser();
  await connectDB();
  const live = { deletedAt: null };
  const [total, drafts, published, scheduled, categories, tags] = await Promise.all([
    Post.countDocuments(live),
    Post.countDocuments({ ...live, status: "DRAFT" }),
    Post.countDocuments({ ...live, status: "PUBLISHED" }),
    Post.countDocuments({ ...live, status: "SCHEDULED" }),
    Category.countDocuments(),
    Tag.countDocuments(),
  ]);

  const stats = [
    { label: "Total posts", value: total, icon: FileText, href: "/admin/posts" },
    { label: "Drafts", value: drafts, icon: FilePen, href: "/admin/posts?status=DRAFT" },
    { label: "Published", value: published, icon: Globe, href: "/admin/posts?status=PUBLISHED" },
    { label: "Scheduled", value: scheduled, icon: CalendarClock, href: "/admin/posts?status=SCHEDULED" },
    { label: "Categories", value: categories, icon: FolderTree, href: "/admin/categories" },
    { label: "Tags", value: tags, icon: Tags, href: "/admin/tags" },
  ];

  return (
    <section aria-label="Content totals" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {stats.map((s) => (
        <Link key={s.label} href={s.href} className="rounded-lg border border-line bg-white p-4 transition-colors hover:border-evergreen-600">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm">{s.label}</span>
            <s.icon className="size-4" aria-hidden />
          </div>
          <p className="mt-2 font-display text-3xl font-semibold text-evergreen-700">{s.value}</p>
        </Link>
      ))}
    </section>
  );
}

function PostList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; title: string; meta: string; badge?: string }[];
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="font-display text-base font-semibold text-evergreen-700">{title}</h2>
      {items.length ? (
        <ul className="mt-4 divide-y divide-line">
          {items.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 py-2.5">
              <Link href={`/admin/posts/${p.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-evergreen-700 hover:underline">
                {p.title}
              </Link>
              {p.badge && (
                <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-evergreen-700">{p.badge}</span>
              )}
              <span className="shrink-0 text-xs text-muted-foreground">{p.meta}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

async function RecentPosts() {
  await requirePageUser();
  await connectDB();
  const posts = await Post.find({ deletedAt: null })
    .sort({ updatedAt: -1 })
    .limit(6)
    .select({ title: 1, status: 1, updatedAt: 1, "scores.seo": 1 })
    .lean();
  return (
    <PostList
      title="Recent posts"
      empty="No posts yet."
      items={posts.map((p) => ({
        id: p._id.toString(),
        title: p.title,
        badge: `${p.status.toLowerCase()} · SEO ${p.scores?.seo ?? 0}`,
        meta: dateTime.format(p.updatedAt),
      }))}
    />
  );
}

async function UpcomingScheduled() {
  await requirePageUser();
  await connectDB();
  const posts = await Post.find({ deletedAt: null, status: "SCHEDULED" })
    .sort({ scheduledFor: 1 })
    .limit(6)
    .select({ title: 1, scheduledFor: 1 })
    .lean();
  return (
    <PostList
      title="Upcoming scheduled posts"
      empty="Nothing scheduled."
      items={posts.map((p) => ({
        id: p._id.toString(),
        title: p.title,
        meta: p.scheduledFor ? `${dateTime.format(p.scheduledFor)} IST` : "",
      }))}
    />
  );
}

async function LowScorePosts() {
  await requirePageUser();
  await connectDB();
  const posts = await Post.find({ deletedAt: null, "scores.computedAt": { $ne: null }, "scores.seo": { $lt: 60 } })
    .sort({ "scores.seo": 1 })
    .limit(6)
    .select({ title: 1, status: 1, "scores.seo": 1, "scores.aeo": 1, "scores.geo": 1 })
    .lean();
  return (
    <PostList
      title="Low SEO score (below 60)"
      empty="Every scored post is at 60 or above."
      items={posts.map((p) => ({
        id: p._id.toString(),
        title: p.title,
        badge: p.status.toLowerCase(),
        meta: `SEO ${p.scores?.seo ?? 0} · AEO ${p.scores?.aeo ?? 0} · GEO ${p.scores?.geo ?? 0}`,
      }))}
    />
  );
}

async function BrokenLinksWidget() {
  await requirePageUser();
  await connectDB();
  const [broken, posts, last] = await Promise.all([
    LinkCheck.countDocuments({ isBroken: true }),
    LinkCheck.distinct("postId", { isBroken: true }),
    LinkCheck.findOne().sort({ lastCheckedAt: -1 }).select({ lastCheckedAt: 1 }).lean(),
  ]);
  return (
    <section className="rounded-xl border border-line bg-white p-5">
      <h2 className="font-display text-base font-semibold text-evergreen-700">Broken links</h2>
      <p className="mt-3 font-display text-3xl font-semibold" style={{ color: broken ? "#c43a4a" : "#4E6B12" }}>
        {broken}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {broken ? `in ${posts.length} post${posts.length === 1 ? "" : "s"}` : "No broken links or images."} · last scan{" "}
        {last?.lastCheckedAt ? dateTime.format(last.lastCheckedAt) : "never"}
      </p>
      <Link href="/admin/seo/broken-links" className="mt-3 inline-block text-sm font-medium text-moss-ink hover:underline">
        Open Broken Links →
      </Link>
    </section>
  );
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

async function StalePosts() {
  await requirePageUser();
  await connectDB();
  const yearAgo = daysAgo(365);
  const posts = await Post.find({ deletedAt: null, status: "PUBLISHED", $or: [{ modifiedAt: { $lt: yearAgo } }, { modifiedAt: null, publishedAt: { $lt: yearAgo } }] })
    .sort({ modifiedAt: 1, publishedAt: 1 })
    .limit(8)
    .select({ title: 1, modifiedAt: 1, publishedAt: 1 })
    .lean();
  return (
    <PostList
      title="Stale posts (not updated in 12+ months)"
      empty="Nothing stale. Every live post was updated within the last year."
      items={posts.map((p) => {
        const d = p.modifiedAt ?? p.publishedAt;
        return { id: p._id.toString(), title: p.title, meta: d ? `Updated ${dateTime.format(d)}` : "" };
      })}
    />
  );
}

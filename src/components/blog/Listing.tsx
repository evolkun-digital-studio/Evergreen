import Link from "next/link";
import { Rss } from "lucide-react";
import type { PostCard as Card, PublicTerm } from "@/lib/data/blog";
import { cn } from "@/lib/utils";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { Pagination } from "./Pagination";
import { Picture } from "./Picture";
import { PostCard } from "./PostCard";
import { formatDate } from "./format";
import { FontSafe } from "@/components/FontSafe";

function FeaturedPost({ post }: { post: Card }) {
  return (
    <article className="group relative grid overflow-hidden rounded-3xl border border-line bg-white md:grid-cols-[1.2fr_1fr]">
      <div className="aspect-[1200/630] bg-paper-2 md:aspect-auto">
        {post.image ? (
          <Picture
            media={post.image}
            alt={post.imageAlt}
            sizes="(min-width: 768px) 60vw, 100vw"
            priority
            imgClassName="h-full w-full object-cover"
          />
        ) : (
          <span className="grid h-full min-h-48 place-items-center bg-evergreen-900 font-display text-2xl font-semibold text-moss-soft">Evergreen</span>
        )}
      </div>
      <div className="flex flex-col justify-center p-6 md:p-10">
        <p className="meta text-moss-ink">Latest{post.category ? ` · ${post.category.name}` : ""}</p>
        <h2 className="mt-3 text-evergreen-700">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 hover:underline">
            <FontSafe>{post.title}</FontSafe>
          </Link>
        </h2>
        {post.excerpt && <p className="mt-3 text-ink/85">{post.excerpt}</p>}
        <p className="mt-5 text-sm text-ink/80">
          {post.authorName} · <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          {post.readingTimeMinutes > 0 && ` · ${post.readingTimeMinutes} min read`}
        </p>
      </div>
    </article>
  );
}

export function CategoryChips({ categories, active }: { categories: (PublicTerm & { count: number })[]; active?: string }) {
  if (!categories.length) return null;
  const chip = "inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors";
  return (
    <nav aria-label="Categories">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link href="/blog" aria-current={!active ? "page" : undefined} className={cn(chip, !active ? "border-evergreen-700 bg-evergreen-700 text-white" : "border-line bg-white text-evergreen-700 hover:border-evergreen-600")}>
            All
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/blog/category/${c.slug}`}
              aria-current={active === c.slug ? "page" : undefined}
              className={cn(chip, active === c.slug ? "border-evergreen-700 bg-evergreen-700 text-white" : "border-line bg-white text-evergreen-700 hover:border-evergreen-600")}
            >
              {c.name} <span className="ml-1.5 text-xs opacity-75">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Shared shell for /blog and the category / tag / author archives. */
export function ListingShell({
  crumbs,
  eyebrow,
  title,
  description,
  aside,
  chips,
  posts,
  page,
  pages,
  base,
  featured,
  jsonLd,
}: {
  crumbs: Crumb[];
  eyebrow?: string;
  title: string;
  description?: string;
  aside?: React.ReactNode;
  chips?: React.ReactNode;
  posts: Card[];
  page: number;
  pages: number;
  base: string;
  featured?: Card | null;
  /** Serialised JSON-LD for the page. */
  jsonLd?: string;
}) {
  return (
    <div className="container pb-20 pt-8 lg:pt-12">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}
      <Breadcrumbs items={crumbs} />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          {eyebrow && <p className="meta text-moss-ink">{eyebrow}</p>}
          <h1 className="mt-2 text-evergreen-700">
            <FontSafe>{title}</FontSafe>
          </h1>
          {description && <p className="lead mt-4 text-ink/85">{description}</p>}
        </div>
        <a href="/blog/feed.xml" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-moss-ink hover:underline">
          <Rss className="size-4" aria-hidden /> RSS feed
        </a>
      </header>
      {aside && <div className="mt-8">{aside}</div>}
      {chips && <div className="mt-8">{chips}</div>}
      {featured && (
        <div className="mt-10">
          <FeaturedPost post={featured} />
        </div>
      )}
      {posts.length ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <PostCard key={p.id} post={p} priority={!featured && i === 0} />
          ))}
        </div>
      ) : (
        !featured && <p className="mt-12 rounded-2xl border border-line bg-white p-10 text-center text-ink/80">No articles have been published here yet.</p>
      )}
      <Pagination base={base} page={page} pages={pages} />
    </div>
  );
}

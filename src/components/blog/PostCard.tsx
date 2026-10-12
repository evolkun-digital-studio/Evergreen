import Link from "next/link";
import type { PostCard as Card } from "@/lib/data/blog";
import { Picture } from "./Picture";
import { formatDate } from "./format";
import { FontSafe } from "@/components/FontSafe";

export function PostCard({ post, priority = false }: { post: Card; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(16, 54, 38,0.45)]">
      <Link href={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true" className="block aspect-[1200/630] overflow-hidden bg-paper-2">
        {post.image ? (
          <Picture
            media={post.image}
            alt=""
            sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
            priority={priority}
            imgClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid h-full place-items-center bg-evergreen-900 font-display text-lg font-semibold text-moss-soft">Evergreen</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        {post.category && (
          <Link href={`/blog/category/${post.category.slug}`} className="meta relative z-10 self-start text-moss-ink hover:underline">
            {post.category.name}
          </Link>
        )}
        <h3 className="mt-2 text-evergreen-700">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 hover:underline">
            <FontSafe>{post.title}</FontSafe>
          </Link>
        </h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink/80">{post.excerpt}</p>}
        <p className="mt-auto pt-4 text-xs text-ink/80">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          {post.readingTimeMinutes > 0 && ` · ${post.readingTimeMinutes} min read`}
        </p>
      </div>
    </article>
  );
}

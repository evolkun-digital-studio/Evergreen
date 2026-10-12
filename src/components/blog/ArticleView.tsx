import Link from "next/link";
import { CalendarDays, Clock, RefreshCw, ShieldCheck } from "lucide-react";
import type { PostCard as Card, PublicPost } from "@/lib/data/blog";
import { postUrl } from "@/lib/seo/metadata";
import { ArticleEnhancements } from "./ArticleEnhancements";
import { AdjacentPosts, AuthorBox, Avatar, ServiceCta, ShareLinks, TocMobile, TocSidebar } from "./ArticleParts";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { Picture } from "./Picture";
import { PostCard } from "./PostCard";
import { formatDate } from "./format";
import { FontSafe } from "@/components/FontSafe";

/** Visible verdict for review posts, so Review/Product markup describes on-page content. */
function ReviewBox({ review, product }: { review: NonNullable<PublicPost["schemaExtras"]["review"]>; product: PublicPost["schemaExtras"]["product"] }) {
  return (
    <section aria-labelledby="review-title" className="rounded-2xl border border-line bg-white p-6">
      <h2 id="review-title" className="text-evergreen-700">
        Our verdict: {product?.name || review.itemName}
      </h2>
      {product && (product.brand || product.priceRange) && (
        <p className="mt-1 text-sm text-ink/80">{[product.brand && `Brand: ${product.brand}`, product.priceRange && `Price: ${product.priceRange}`].filter(Boolean).join(" · ")}</p>
      )}
      {review.ratingValue !== null && (
        <p className="stat-value mt-3 text-evergreen-700">
          {review.ratingValue}
          <span className="text-base font-normal text-ink/80"> / {review.bestRating}</span>
        </p>
      )}
      {(review.pros.length > 0 || review.cons.length > 0) && (
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {review.pros.length > 0 && (
            <div>
              <h3 className="text-moss-ink">Pros</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink">{review.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
          )}
          {review.cons.length > 0 && (
            <div>
              <h3 className="text-[#92400e]">Cons</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink">{review.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function articleCrumbs(post: PublicPost): Crumb[] {
  return [
    { name: "Home", href: "/" },
    { name: "Blog", href: "/blog" },
    ...(post.category ? [{ name: post.category.name, href: `/blog/category/${post.category.slug}` }] : []),
    { name: post.title },
  ];
}

const sameDay = (a: string, b: string) => formatDate(a) === formatDate(b);

/**
 * The public article template. Server-rendered; the only client JS is ArticleEnhancements.
 * Speakable selectors (.article-title, .ai-summary, .key-takeaways) are referenced by the schema.
 */
export function ArticleView({
  post,
  related,
  adjacent,
}: {
  post: PublicPost;
  related: Card[];
  adjacent: { prev: Card | null; next: Card | null };
}) {
  const showToc = post.headingCount >= 3;
  const updated = !sameDay(post.modifiedAt, post.publishedAt);
  const takeaways = post.ai.keyTakeaways.filter((t) => t.trim());
  const faqs = post.ai.faqs.filter((f) => f.question.trim() && f.answer.trim());
  const review = post.schemaExtras.review;
  const isReview = (post.ai.contentType === "Review" || post.ai.contentType === "ProductReview") && Boolean(review?.itemName);

  return (
    <article className="pb-20">
      <div className="container pt-8 lg:pt-12">
        {post.seo.breadcrumbEnabled && <Breadcrumbs items={articleCrumbs(post)} />}

        <header className="mt-6 max-w-3xl">
          {post.category && (
            <Link
              href={`/blog/category/${post.category.slug}`}
              className="meta inline-flex rounded-full bg-evergreen-700/12 px-3 py-1 text-moss-ink hover:bg-evergreen-800/20"
            >
              {post.category.name}
            </Link>
          )}
          <h1 className="article-title mt-4 text-evergreen-700">
            <FontSafe>{post.title}</FontSafe>
          </h1>

          {post.ai.aiSummary && (
            <section aria-labelledby="quick-answer" className="ai-summary mt-6 rounded-2xl border-l-4 border-evergreen-600 bg-white p-5 shadow-[0_1px_0_rgba(16, 54, 38,0.06)]">
              <p id="quick-answer" className="meta text-moss-ink">
                Quick answer
              </p>
              <p className="lead mt-2 text-ink">{post.ai.aiSummary}</p>
            </section>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink/85">
            <Link href={`/blog/author/${post.author.slug}`} className="flex items-center gap-2.5 font-medium text-evergreen-700 hover:underline" rel="author">
              <Avatar author={post.author} size={36} />
              {post.author.name}
            </Link>
            {post.reviewer && post.reviewer.id !== post.author.id && (
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-moss-ink" aria-hidden />
                Reviewed by{" "}
                <Link href={`/blog/author/${post.reviewer.slug}`} className="font-medium text-evergreen-700 hover:underline">
                  {post.reviewer.name}
                </Link>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4 text-moss-ink" aria-hidden />
              Published <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            </span>
            {updated && (
              <span className="flex items-center gap-1.5">
                <RefreshCw className="size-4 text-moss-ink" aria-hidden />
                Updated <time dateTime={post.modifiedAt}>{formatDate(post.modifiedAt)}</time>
              </span>
            )}
            {post.readingTimeMinutes > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-4 text-moss-ink" aria-hidden />
                {post.readingTimeMinutes} min read
              </span>
            )}
          </div>
        </header>

        {post.image && (
          <figure className="mt-8 max-w-5xl">
            <Picture
              media={post.image}
              alt={post.imageAlt}
              title={post.imageTitle}
              sizes="(min-width: 1024px) 1024px, 100vw"
              priority
              imgClassName="aspect-[1200/630] w-full rounded-2xl object-cover"
            />
            {post.imageCaption && <figcaption className="mt-2 text-center text-sm text-ink/80">{post.imageCaption}</figcaption>}
          </figure>
        )}

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,720px)_260px] lg:justify-between">
          <div className="min-w-0 space-y-8">
            {takeaways.length > 0 && !post.blocks.takeaways && (
              <section aria-labelledby="key-takeaways-title" className="key-takeaways">
                <h2 id="key-takeaways-title" className="key-takeaways-title">
                  Key takeaways
                </h2>
                <ul>
                  {takeaways.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </section>
            )}

            {showToc && <TocMobile items={post.toc} />}

            {isReview && review && <ReviewBox review={review} product={post.ai.contentType === "ProductReview" ? post.schemaExtras.product : null} />}

            {/* Rendered and allowlist-sanitised at save time by lib/content/render.ts. */}
            <div className="article-body" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

            {faqs.length > 0 && !post.blocks.faq && (
              <section aria-labelledby="faq-title" className="faq article-body">
                <h2 id="faq-title">Frequently asked questions</h2>
                {faqs.map((f, i) => (
                  <details key={i} className="faq-item">
                    <summary>
                      <h3 className="faq-question">{f.question}</h3>
                    </summary>
                    <div className="faq-answer">
                      {f.answer.split(/\n{2,}/).map((para, j) => (
                        <p key={j}>{para}</p>
                      ))}
                    </div>
                  </details>
                ))}
              </section>
            )}

            {post.tags.length > 0 && (
              <ul aria-label="Tags" className="flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/blog/tag/${t.slug}`} className="inline-flex rounded-full border border-line bg-white px-3 py-1 text-sm text-evergreen-700 hover:border-evergreen-600">
                      #{t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <ShareLinks url={postUrl(post.slug)} title={post.title} />
            <AuthorBox author={post.author} />
            {post.reviewer && post.reviewer.id !== post.author.id && <AuthorBox author={post.reviewer} label="Reviewed by" />}
            <ServiceCta />
            <AdjacentPosts prev={adjacent.prev} next={adjacent.next} />
          </div>

          {showToc && (
            <aside className="hidden lg:block">
              <TocSidebar items={post.toc} />
            </aside>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="container mt-16">
          <h2 id="related-title" className="text-evergreen-700">
            Related articles
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <PostCard key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}

      <ArticleEnhancements />
    </article>
  );
}

import Link from "next/link";
import { ArrowLeft, ArrowRight, Facebook, Linkedin, Link2, Mail, MessageCircle, Phone, UserRound } from "lucide-react";
import type { TocItem } from "@/lib/content/toc";
import type { PostCard as Card, PublicAuthor } from "@/lib/data/blog";
import { pickVariantUrl } from "@/lib/media/types";
import { publicPhone, site, telHref } from "@/config/site";
import { FontSafe } from "@/components/FontSafe";
import { services } from "@/content/services";

// --- Table of contents ----------------------------------------------------------------------

function TocList({ items }: { items: TocItem[] }) {
  return (
    <ol className="space-y-1">
      {items.map((i) => (
        <li key={i.id}>
          <a
            href={`#${i.id}`}
            className="block border-l-2 border-transparent py-1 pl-3 text-sm leading-snug text-ink/80 hover:text-evergreen-700 aria-[current=location]:border-evergreen-600 aria-[current=location]:font-medium aria-[current=location]:text-evergreen-700"
          >
            {i.text}
          </a>
          {i.children.length > 0 && (
            <div className="pl-3">
              <TocList items={i.children} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Sticky sidebar on desktop. */
export function TocSidebar({ items }: { items: TocItem[] }) {
  return (
    <nav aria-label="Table of contents" data-toc className="sticky top-[calc(var(--header-h)+1.5rem)] max-h-[calc(100vh-var(--header-h)-3rem)] overflow-y-auto">
      <p className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-moss-ink">On this page</p>
      <TocList items={items} />
    </nav>
  );
}

/** Collapsible block for small screens. */
export function TocMobile({ items }: { items: TocItem[] }) {
  return (
    <details className="group rounded-xl border border-line bg-white lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-display text-sm font-semibold text-evergreen-700 [&::-webkit-details-marker]:hidden">
        Table of contents
        <span aria-hidden className="text-moss-ink transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <nav aria-label="Table of contents" data-toc className="border-t border-line px-2 py-3">
        <TocList items={items} />
      </nav>
    </details>
  );
}

// --- Byline helpers ---------------------------------------------------------------------------

export function Avatar({ author, size = 40 }: { author: PublicAuthor; size?: number }) {
  return author.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={pickVariantUrl(author.avatar, 320)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-paper-2 text-evergreen-700" style={{ width: size, height: size }} aria-hidden>
      <UserRound className="size-1/2" />
    </span>
  );
}

// --- Author box (E-E-A-T) ---------------------------------------------------------------------

export function AuthorBox({ author, label = "About the author" }: { author: PublicAuthor; label?: string }) {
  return (
    <aside aria-label={label} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 sm:flex-row">
      <Avatar author={author} size={72} />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-moss-ink">{label}</p>
        <p className="mt-1 font-display text-lg font-semibold text-evergreen-700">
          <Link href={`/blog/author/${author.slug}`} className="hover:underline">
            <FontSafe>{author.name}</FontSafe>
          </Link>
        </p>
        {(author.jobTitle || author.credentials) && <p className="text-sm text-ink/80">{[author.jobTitle, author.credentials].filter(Boolean).join(" · ")}</p>}
        {author.bio && <p className="mt-3 text-sm leading-relaxed text-ink">{author.bio}</p>}
        {author.sameAs.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-3 text-sm">
            {author.sameAs.map((url) => (
              <li key={url}>
                <a href={url} rel="noopener me" target="_blank" className="text-moss-ink underline underline-offset-2">
                  {new URL(url).hostname.replace(/^www\./, "")}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

// --- Share (plain links, no third-party scripts) ----------------------------------------------

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, icon: Linkedin },
    { label: "X", href: `https://x.com/intent/post?url=${u}&text=${t}`, icon: () => <span className="text-sm font-semibold leading-none">𝕏</span> },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, icon: Facebook },
    { label: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}`, icon: MessageCircle },
    { label: "Email", href: `mailto:?subject=${t}&body=${u}`, icon: Mail },
  ];
  const btn = "inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-sm text-evergreen-700 hover:border-evergreen-600";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-medium text-evergreen-700">Share</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener nofollow" className={btn} aria-label={`Share on ${l.label}`}>
          <l.icon className="size-4" aria-hidden />
        </a>
      ))}
      <button type="button" data-copy-link className={btn}>
        <Link2 className="size-4" aria-hidden /> <span data-label>Copy link</span>
      </button>
    </div>
  );
}

// --- CTA ------------------------------------------------------------------------------------

export function ServiceCta() {
  return (
    <section aria-labelledby="cta-title" className="rounded-xl border border-line bg-white p-8 md:p-10">
      <h2 id="cta-title">Recycling services from Evergreen</h2>
      <p className="mt-3 max-w-xl text-ink/80">
        {site.legalName} recycles e-waste, batteries, plastics and industrial scrap from its authorised facility in{" "}
        {site.address.locality}, {site.address.region}.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/services" className="btn btn-primary">
          Our services
        </Link>
        {publicPhone && (
          <a href={telHref(publicPhone)} className="inline-flex h-11 items-center gap-2 px-2 font-medium text-ink/80 tabular-nums hover:text-evergreen-700">
            <Phone className="size-4" aria-hidden /> {publicPhone}
          </a>
        )}
      </div>
      <nav aria-label="Services" className="mt-8 border-t border-line pt-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {services.map(s => (
            <li key={s.slug}>
              <Link href={`/services/${s.slug}`} className="inline-flex min-h-11 items-center text-[15px] font-medium text-evergreen-700 hover:underline">
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

// --- Previous / next ----------------------------------------------------------------------------

export function AdjacentPosts({ prev, next }: { prev: Card | null; next: Card | null }) {
  if (!prev && !next) return null;
  const item = "flex flex-1 flex-col rounded-xl border border-line bg-white p-4 hover:border-evergreen-600";
  return (
    <nav aria-label="More articles" className="flex flex-col gap-3 sm:flex-row">
      {prev ? (
        <Link href={`/blog/${prev.slug}`} rel="prev" className={item}>
          <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-moss-ink">
            <ArrowLeft className="size-3.5" aria-hidden /> Previous
          </span>
          <span className="mt-1 font-medium text-evergreen-700">{prev.title}</span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
      {next ? (
        <Link href={`/blog/${next.slug}`} rel="next" className={`${item} sm:text-right`}>
          <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-moss-ink sm:justify-end">
            Next <ArrowRight className="size-3.5" aria-hidden />
          </span>
          <span className="mt-1 font-medium text-evergreen-700">{next.title}</span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
    </nav>
  );
}

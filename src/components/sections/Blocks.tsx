import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ConfirmBadge } from "@/components/Confirm";
import { FontSafe } from "@/components/FontSafe";
import { Photo } from "@/components/Photo";
import type { Photo as PhotoData } from "@/content/images";
import { library, materialPhotos } from "@/content/images";
import { CAPACITY_LABEL, capacity, formatTonnes } from "@/content/stats";
import type { Faq, Source, WorkflowStep } from "@/content/services";
import { entity } from "@/content/entity";
import { cn } from "@/lib/utils";

/** Section heading row: H2 (+ optional lead) on the left, an optional link on the right. Same left edge as the body. */
export function SectionHead({
  id,
  title,
  lead,
  link,
  className,
}: {
  id: string;
  title: string;
  lead?: string;
  link?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("mb-10 flex flex-col gap-4 lg:mb-12 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div>
        <h2 id={id}>{title}</h2>
        {lead && <p className="lead mt-4 max-w-2xl">{lead}</p>}
      </div>
      {link && (
        <Link href={link.href} className="text-link min-h-11 shrink-0">
          {link.label}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/** Steps as a row of images with one-line captions. 1 → 2 → 3–5 columns. */
export function Workflow({ steps }: { steps: WorkflowStep[] }) {
  const cols = steps.length >= 5 ? "lg:grid-cols-5" : steps.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <ol className={cn("grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10", cols)}>
      {steps.map((s, i) => (
        <li key={s.title} className="flex flex-col">
          <Photo
            photo={s.photo}
            ratio="4/3"
            sizes={`(min-width: 1280px) ${Math.round(1184 / Math.max(steps.length, 3))}px, 46vw`}
          />
          <p className="meta mt-4 text-copper-ink">Step {i + 1}</p>
          <h3 className="mt-1 text-[1.0625rem] sm:text-[length:var(--fs-h3)]">{s.title}</h3>
          <p className="mt-2 text-[15px] text-ink-muted sm:text-base">{s.caption}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * FAQ with each question as an H3 and the direct answer first (AEO). Pair with faqJsonLd() for FAQPage.
 * Two-column layout on desktop: heading left, questions right.
 */
export function FaqSection({ id, title, items, intro }: { id: string; title: string; items: Faq[]; intro?: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="section border-t border-line">
      <div className="container grid gap-10 lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-4">
          <h2 id={id}>{title}</h2>
          {intro && <div className="mt-4 text-ink-muted">{intro}</div>}
        </div>
        <div className="divide-y divide-line border-y border-line lg:col-span-8">
          {items.map(f => (
            <div key={f.q} className="py-6">
              <h3 className="text-[1.125rem] leading-snug">{f.q}</h3>
              <p className="mt-2 max-w-[68ch] text-ink/85">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Annual processing capacity: three figures beside a wide yard photo. Always labelled as capacity. */
export function CapacityBand({
  photo = library.capacity,
  className,
  children,
}: {
  photo?: PhotoData;
  className?: string;
  /** Extra full-width row under the band (the home page puts its key figures here). */
  children?: React.ReactNode;
}) {
  return (
    <section aria-labelledby="capacity-heading" className={cn("section bg-paper-2", className)}>
      <div className="container grid items-stretch gap-10 lg:grid-cols-12 lg:gap-x-12">
        <div className="flex flex-col lg:col-span-5">
          <h2 id="capacity-heading">{CAPACITY_LABEL}</h2>
          <p className="lead mt-4">
            What our plant in Sitapur can process in a year, in metric tonnes (MT). Pickup is available from client locations anywhere in India.
          </p>
          <dl className="mt-8 grid grid-cols-1 border-t border-line sm:grid-cols-3 lg:mt-auto lg:grid-cols-1">
            {capacity.map(c => (
              <div key={c.id} className="flex items-baseline justify-between gap-4 border-b border-line py-5 sm:block lg:flex">
                <dt className="text-ink-muted">
                  <Link href={`/services/${c.service}`} className="hover:text-evergreen-700">
                    {c.material}
                  </Link>
                </dt>
                <dd className="stat-value tabular-nums text-evergreen-900 sm:mt-2 lg:mt-0">
                  <FontSafe>{formatTonnes(c.tonnes)}</FontSafe>
                </dd>
              </div>
            ))}
          </dl>
          {capacity.some(c => c.verify) && <ConfirmBadge label="capacity figures from outreach material" className="mt-3 self-start" />}
        </div>
        <Photo
          photo={photo}
          ratio="stretch"
          sizes="(min-width: 1280px) 680px, (min-width: 1024px) 55vw, 92vw"
          className="order-first lg:order-none lg:col-span-7"
        />
        {children && <div className="lg:col-span-12">{children}</div>}
      </div>
    </section>
  );
}

/** Capacity for one service, as a single figure (service pages). */
export function CapacityNote({ material, tonnes }: { material: string; tonnes: number }) {
  return (
    <p className="meta mt-6 flex flex-wrap items-baseline gap-x-2 text-ink-muted">
      <span>
        {CAPACITY_LABEL} ({material.toLowerCase()}):
      </span>
      <span className="font-display text-[1.25rem] font-semibold text-evergreen-900 tabular-nums">
        <FontSafe>{formatTonnes(tonnes)}</FontSafe>
      </span>
    </p>
  );
}

/** Home "Materials we recover": four 1:1 tiles, 2×2 on mobile. */
export function MaterialsStrip() {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
      {materialPhotos.map(m => (
        <li key={m.label}>
          <Link href={m.href} className="group block">
            <Photo photo={m.photo} ratio="1/1" sizes="(min-width: 1280px) 280px, (min-width: 1024px) 22vw, 45vw" />
            <h3 className="mt-4 text-[1.125rem] group-hover:text-evergreen-700">{m.label}</h3>
            <p className="meta mt-1 font-normal text-ink-muted">{m.caption}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The entity block: the same facts in the same words on Home, About and Contact (GEO).
 * Wording lives in src/content/entity.ts.
 */
export function EntityBlock({ className }: { className?: string }) {
  return (
    <section aria-labelledby="entity-heading" className={cn("section border-t border-line", className)}>
      <div className="container">
        <h2 id="entity-heading">Company facts</h2>
        <p className="mt-4 max-w-[70ch] text-[16px] leading-[1.6] text-ink-muted">{entity.summary}</p>
        <div className="mt-8 grid gap-8 rounded-xl border border-line bg-paper-2 p-5 md:grid-cols-3 md:gap-10 lg:p-8">
          {entity.groups.map(g => (
            <div key={g.label} className="min-w-0">
              <h3 className="text-[12px] font-semibold uppercase leading-none tracking-[0.12em] text-copper-ink">{g.label}</h3>
              <dl className="mt-3 divide-y divide-line">
                {g.rows.map(r => (
                  <div key={r.label} className="py-3.5 first:pt-2 last:pb-0">
                    <dt className="text-[13px] leading-snug text-ink-muted">{r.label}</dt>
                    <dd className="mt-1 text-[15px] font-medium leading-snug text-ink [overflow-wrap:anywhere]">
                      {r.lines ? (
                        r.lines.map(l => (
                          <span key={l} className="block tabular-nums">
                            <FontSafe>{l}</FontSafe>
                          </span>
                        ))
                      ) : r.href ? (
                        <a href={r.href} className="text-evergreen-700 tabular-nums hover:underline">
                          {r.value}
                        </a>
                      ) : (
                        r.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Related services + the EPR calculator + the process page (internal links on every service page). */
export function RelatedLinks({ links }: { links: { href: string; label: string; note: string }[] }) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {links.map(l => (
        <li key={l.href} className="bg-paper">
          <Link href={l.href} className="group flex h-full min-h-11 flex-col gap-1 p-6 transition-colors hover:bg-white">
            <span className="font-display text-[1.0625rem] font-semibold text-evergreen-950 group-hover:text-evergreen-700">{l.label}</span>
            <span className="meta font-normal text-ink-muted">{l.note}</span>
            <ArrowRight aria-hidden="true" className="mt-auto h-4 w-4 pt-1 text-evergreen-700 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** "Sources" list for regulatory statements. External links open in a new tab. */
export function SourceList({ items, className }: { items: Source[]; className?: string }) {
  if (!items.length) return null;
  return (
    <div className={cn("meta font-normal text-ink-muted", className)}>
      <p className="font-semibold text-ink">Sources</p>
      <ul className="mt-1">
        {items.map(s => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-evergreen-700 underline decoration-evergreen-700/30 underline-offset-2 hover:decoration-evergreen-700">
              {s.label}
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

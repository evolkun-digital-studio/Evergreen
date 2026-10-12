import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Photo } from "@/components/Photo";
import type { Photo as PhotoData } from "@/content/images";
import type { Crumb } from "@/lib/seo/pages";

/**
 * Inner-page header: breadcrumbs → H1 → lead, with an optional 16:9 photo on the right (7/5 split of
 * the 12-column grid). On mobile the photo comes first. The photo is the page's LCP image, so it loads eagerly.
 */
export function PageHeader({
  title,
  lead,
  crumbs,
  photo,
  children,
}: {
  title: string;
  lead?: string;
  crumbs: Crumb[];
  photo?: PhotoData;
  /** Extra content under the lead (a button row or a capacity note). */
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="container pb-12 pt-8 lg:pb-16 lg:pt-12">
        <nav aria-label="Breadcrumb">
          <ol className="meta flex flex-wrap items-center gap-1.5 text-ink-muted">
            <li>
              <Link href="/" className="inline-flex min-h-11 items-center hover:text-evergreen-700">
                Home
              </Link>
            </li>
            {crumbs.map((c, i) => (
              <li key={c.path} className="flex items-center gap-1.5">
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
                {i === crumbs.length - 1 ? (
                  <span aria-current="page">{c.name}</span>
                ) : (
                  <Link href={c.path} className="inline-flex min-h-11 items-center hover:text-evergreen-700">
                    {c.name}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <div className={photo ? "mt-4 grid items-center gap-8 lg:grid-cols-12 lg:gap-x-12" : "mt-4"}>
          <div className={photo ? "lg:col-span-6" : undefined}>
            <h1>{title}</h1>
            {lead && <p className="lead mt-5 max-w-2xl">{lead}</p>}
            {children}
          </div>
          {photo && (
            <Photo
              photo={photo}
              ratio="16/9"
              sizes="(min-width: 1280px) 584px, (min-width: 1024px) 46vw, 92vw"
              eager
              className="order-first lg:order-none lg:col-span-6"
            />
          )}
        </div>
      </div>
    </header>
  );
}

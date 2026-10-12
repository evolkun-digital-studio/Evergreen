import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { name: string; href?: string };

/** Visible trail; the matching BreadcrumbList JSON-LD is built from the same items. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-ink/75">
        {items.map((c, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />}
            {c.href ? (
              <Link href={c.href} className="inline-flex min-h-11 items-center hover:text-evergreen-700 hover:underline">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="truncate text-evergreen-700">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

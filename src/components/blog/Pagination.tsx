import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Crawlable numbered pagination: page 1 is the base URL, others are <base>/page/<n>. */
export function Pagination({ base, page, pages }: { base: string; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (n: number) => (n <= 1 ? base : `${base}/page/${n}`);
  const window = [...new Set([1, page - 1, page, page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const item = "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm";
  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className={cn(item, "border-line bg-white text-evergreen-700 hover:border-evergreen-600")}>
          <ChevronLeft className="size-4" aria-hidden /> Newer
        </Link>
      )}
      {window.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && n - window[i - 1] > 1 && <span className="text-ink-muted">…</span>}
          <Link
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(item, n === page ? "border-evergreen-700 bg-evergreen-700 text-white" : "border-line bg-white text-evergreen-700 hover:border-evergreen-600")}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} rel="next" className={cn(item, "border-line bg-white text-evergreen-700 hover:border-evergreen-600")}>
          Older <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </nav>
  );
}

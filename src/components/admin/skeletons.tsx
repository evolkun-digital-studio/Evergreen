import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-evergreen-700/[0.08]", className)} />;
}

// Suspense fallbacks for admin screens. Admin data is never cached, so every component that
// reads MongoDB or the session streams in behind one of these while the page shell renders.

export function StatCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6" aria-busy="true" aria-label="Loading totals">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg border border-line bg-white p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-8 w-12" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5, title }: { rows?: number; title?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5" aria-busy="true" aria-label={title ? `Loading ${title}` : "Loading"}>
      {title ? <h2 className="font-display text-base font-semibold text-evergreen-700">{title}</h2> : <Skeleton className="h-5 w-40" />}
      <ul className="mt-4 space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white" aria-busy="true" aria-label="Loading table">
      <div className="flex gap-4 border-b border-line p-4">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 border-b border-line p-4 last:border-0">
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading form">
      {Array.from({ length: sections }, (_, s) => (
        <div key={s} className="rounded-xl border border-line bg-white p-5 md:p-6">
          <Skeleton className="h-5 w-32" />
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SidebarSkeleton() {
  return <div className="hidden w-(--sidebar-width) shrink-0 bg-sidebar md:block" aria-hidden />;
}

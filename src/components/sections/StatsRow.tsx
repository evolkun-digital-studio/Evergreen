import { ConfirmBadge } from "@/components/Confirm";
import { FontSafe } from "@/components/FontSafe";
import { formatStat } from "@/content/stats";

type Stat = { id: string; value: number; suffix: string; label: string; verify: boolean };

export function StatsRow({ items, dark = false }: { items: Stat[]; dark?: boolean }) {
  return (
    <div>
      <dl className={`grid grid-cols-2 gap-y-8 border-y py-8 lg:grid-cols-4 ${dark ? "border-white/15" : "border-line"}`}>
        {items.map(s => (
          <div key={s.id} className="flex flex-col px-1 lg:px-6 lg:first:pl-0">
            <dt className={`meta order-2 mt-1 ${dark ? "text-white/70" : "text-ink-muted"}`}>{s.label}</dt>
            <dd
              className={`stat-value order-1 tabular-nums ${dark ? "text-moss-soft" : "text-evergreen-900"}`}
            >
              <FontSafe>{formatStat(s)}</FontSafe>
            </dd>
          </div>
        ))}
      </dl>
      {items.some(s => s.verify) && <ConfirmBadge label="figures from evergreenrecycler.in (src/content/stats.ts)" className="mt-3" />}
    </div>
  );
}

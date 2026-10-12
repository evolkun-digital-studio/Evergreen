import Link from "next/link";
import { ArrowRight, Leaf, Recycle, Target, Users, type LucideIcon } from "lucide-react";
import { ConfirmBadge } from "@/components/Confirm";
import { FontSafe } from "@/components/FontSafe";
import { Photo } from "@/components/Photo";
import { sustainability } from "@/content/company";
import { photos } from "@/content/images";
import { formatStat, impact } from "@/content/stats";
import { cn } from "@/lib/utils";

/** One icon per entry in `sustainability.initiatives`, in the same order. */
const initiativeIcons: LucideIcon[] = [Recycle, Target, Leaf, Users];

/**
 * Home page sustainability band. Source order is head → photo → commitments → link → stats.
 * Mobile moves the link to the end; tablet (up to 1279px) moves the photo to the top; xl places
 * everything on a 12-column grid with the photo stretched to the left column's height.
 * Two columns start at xl, not lg: at 1024px the 440px column wraps every commitment and the photo turns portrait.
 */
export function SustainabilityBand() {
  return (
    <section aria-labelledby="sustainability-heading" className="section bg-evergreen-950 text-white">
      <div className="container grid gap-10 xl:grid-cols-12 xl:gap-x-12">
        <div className="xl:col-span-6 xl:col-start-1 xl:row-start-1">
          <h2 id="sustainability-heading" className="text-white">
            Our sustainability commitment
          </h2>
          <p className="mt-8 max-w-[60ch] text-white/80">{sustainability.commitment.join(" ")}</p>
        </div>

        <Photo
          photo={photos.sustainability}
          ratio="stretch"
          sizes="(min-width: 1280px) 568px, 92vw"
          className="max-xl:order-first xl:col-span-6 xl:col-start-7 xl:row-span-3 xl:row-start-1"
        />

        <ul className="grid gap-6 sm:grid-cols-2 xl:col-span-6 xl:col-start-1 xl:row-start-2">
          {sustainability.initiatives.map((item, i) => {
            const Icon = initiativeIcons[i] ?? Leaf;
            return (
              <li key={item.title} className="flex gap-3">
                <Icon aria-hidden="true" className="mt-[5px] h-4 w-4 shrink-0 text-moss-soft" />
                <div>
                  <h3 className="text-[17px] leading-snug text-white">{item.title}</h3>
                  <p className="mt-1 text-[15px] leading-snug text-white/70">{item.summary}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="max-md:order-last xl:col-span-6 xl:col-start-1 xl:row-start-3">
          <Link
            href="/sustainability"
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-moss-soft underline decoration-moss/40 underline-offset-[6px] hover:decoration-moss"
          >
            Sustainability
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <div className="xl:col-span-12 xl:row-start-4 xl:mt-2">
          <dl className="grid grid-cols-2 gap-y-8 border-t border-white/12 pt-8 lg:grid-cols-4">
            {impact.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  "flex flex-col border-white/12 pr-4 lg:pr-6",
                  i % 2 ? "border-l pl-4 lg:pl-6" : "pl-0",
                  i === 2 && "lg:border-l lg:pl-6",
                )}
              >
                <dt className="order-2 mt-2 line-clamp-2 text-sm leading-snug text-white/70">{s.label}</dt>
                <dd className="stat-value order-1 text-[2.5rem] tabular-nums text-moss-soft">
                  <FontSafe>{formatStat(s)}</FontSafe>
                </dd>
              </div>
            ))}
          </dl>
          {impact.some(s => s.verify) && (
            <ConfirmBadge label="verify: figures from evergreenrecycler.in (src/content/stats.ts)" className="mt-3" />
          )}
        </div>
      </div>
    </section>
  );
}

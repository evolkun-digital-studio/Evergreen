import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { SectionHead } from "@/components/sections/Blocks";
import { servicePhotos } from "@/content/images";
import { services } from "@/content/services";
import { cn } from "@/lib/utils";

/**
 * Home "What we recycle" section. Same header rhythm as the sections around it; below it a bento of
 * white tiles on a soft grey stage: words on top, a full-bleed photograph below, one quiet "+".
 * Two wide tiles (first and last) give the grid its rhythm.
 */
const wide = new Set([0, services.length - 1]);

export function RecycleShowcase({ headingId }: { headingId: string }) {
  return (
    <section aria-labelledby={headingId} className="section bg-paper-2">
      <div className="container">
        <SectionHead
          id={headingId}
          title="What we recycle"
          lead="Six specialist recovery routes for electronics, batteries, plastics, metals and industrial assets—with documentation at every stage."
          link={{ href: "/services", label: "View all services" }}
        />

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {services.map((service, index) => {
            const photo = servicePhotos[service.slug];
            const Icon = service.icon;
            const isWide = wide.has(index);

            return (
              <li key={service.slug} className={cn(isWide && "sm:col-span-2")}>
                <Link
                  href={`/services/${service.slug}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white outline-none transition-shadow duration-300 hover:shadow-[0_18px_40px_-28px_rgba(10,38,22,0.4)] focus-visible:ring-2 focus-visible:ring-evergreen-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-2"
                >
                  <div className="flex-1 p-5 pb-0 sm:p-6 sm:pb-0">
                    <Icon aria-hidden="true" className="h-5 w-5 text-evergreen-700" strokeWidth={1.75} />
                    <h3 className="mt-4 text-[1.20rem] leading-[1.2] tracking-[-0.015em]">{service.title}</h3>
                    <p className={cn("mt-2 text-[12px] leading-[1.55] text-ink-muted", isWide ? "max-w-md" : "max-w-[32ch]")}>
                      {service.summary}
                    </p>
                  </div>

                  <div className="relative mt-5 h-44 shrink-0 sm:h-48">
                    {photo && (
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill
                        sizes={isWide ? "(min-width: 1024px) 620px, (min-width: 640px) 90vw, 100vw" : "(min-width: 1024px) 300px, (min-width: 640px) 45vw, 100vw"}
                        placeholder="blur"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        style={photo.position ? { objectPosition: photo.position } : undefined}
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-evergreen-950 shadow-sm backdrop-blur transition-colors duration-200 group-hover:bg-evergreen-700 group-hover:text-white"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

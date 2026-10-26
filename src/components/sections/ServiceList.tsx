import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { servicePhotos } from "@/content/images";
import { services } from "@/content/services";

/**
 * A quiet, editorial service directory: one detailed introduction followed by
 * a flat index. The hierarchy comes from scale and spacing rather than cards.
 */
export function ServiceList() {
  const [featured, ...secondary] = services;

  if (!featured) return null;

  const featuredPhoto = servicePhotos[featured.slug];

  return (
    <div>
      <Link
        href={`/services/${featured.slug}`}
        className="group grid items-center gap-8 border-y border-line py-8 outline-none focus-visible:ring-2 focus-visible:ring-evergreen-600 focus-visible:ring-offset-4 sm:py-10 lg:grid-cols-12 lg:gap-14 lg:py-12"
      >
        <div className="lg:col-span-4">
          <h3 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1]">
            {featured.title}
          </h3>
          <p className="mt-4 max-w-md leading-7 text-ink-muted">
            {featured.summary}
          </p>
          <span className="mt-6 inline-flex min-h-11 items-center gap-1 font-semibold text-evergreen-700">
            Learn more
            <ChevronRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </div>

        {featuredPhoto && (
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-paper-2 lg:col-span-8 lg:aspect-[16/8]">
            <Image
              src={featuredPhoto.src}
              alt={featuredPhoto.alt}
              fill
              sizes="(min-width: 1280px) 760px, (min-width: 1024px) 62vw, 100vw"
              placeholder="blur"
              className="object-cover saturate-[0.82] transition-transform duration-500 ease-out group-hover:scale-[1.015]"
              style={
                featuredPhoto.position
                  ? { objectPosition: featuredPhoto.position }
                  : undefined
              }
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-evergreen-700/[0.04]"
            />
          </div>
        )}
      </Link>

      <ul className="grid border-b border-line sm:grid-cols-2 lg:grid-cols-5">
        {secondary.map((service, index) => {
          const Icon = service.icon;

          return (
            <li
              key={service.slug}
              className={`border-line ${
                index < secondary.length - 1 ? "border-b lg:border-b-0" : ""
              } ${index % 2 === 0 ? "sm:border-r" : ""} sm:last:col-span-2 sm:last:border-r-0 lg:border-r lg:last:col-span-1 lg:last:border-r-0`}
            >
              <Link
                href={`/services/${service.slug}`}
                className="group flex min-h-36 items-start gap-4 px-1 py-6 outline-none transition-colors duration-200 hover:bg-paper-2 focus-visible:bg-paper-2 sm:min-h-40 sm:px-5 lg:min-h-48 lg:flex-col lg:justify-between lg:px-6"
              >
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-evergreen-700 lg:mt-0"
                  strokeWidth={1.75}
                />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3 lg:w-full lg:flex-none lg:items-end">
                  <h3 className="font-display text-lg font-semibold leading-snug text-ink">
                    {service.title}
                  </h3>
                  <ChevronRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-evergreen-700 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

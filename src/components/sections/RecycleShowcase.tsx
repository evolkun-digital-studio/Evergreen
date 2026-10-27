
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SectionHead } from "@/components/sections/Blocks";
import { servicePhotos } from "@/content/images";
import { services } from "@/content/services";
import { cn } from "@/lib/utils";

type Service = (typeof services)[number];
type PanelVariant = "featured" | "supporting" | "standard";

interface ServicePanelProps {
  service: Service;
  variant?: PanelVariant;
}

function ServicePanel({
  service,
  variant = "standard",
}: ServicePanelProps) {
  const photo = servicePhotos[service.slug];
  const Icon = service.icon;

  const aspectClass =
    variant === "featured"
      ? "aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[440px]"
      : variant === "supporting"
        ? "aspect-[16/10]"
        : "aspect-[4/3]";

  const sizes =
    variant === "featured"
      ? "(min-width: 1024px) 58vw, 100vw"
      : variant === "supporting"
        ? "(min-width: 1024px) 42vw, (min-width: 640px) 50vw, 100vw"
        : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

  return (
    <Link
      href={`/services/${service.slug}`}
      className={cn(
        "group relative isolate block w-full overflow-hidden",
        "bg-evergreen-950",
        "outline-none focus-visible:outline-2",
        "focus-visible:outline-offset-4",
        "focus-visible:outline-evergreen-600",
        aspectClass,
      )}
    >
      {/* Background image */}
      {photo ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          placeholder="blur"
          className={cn(
            "object-cover",
            "transition-transform duration-700",
            "ease-[cubic-bezier(0.22,1,0.36,1)]",
            "group-hover:scale-[1.035]",
            "motion-reduce:transition-none",
          )}
          style={
            photo.position
              ? { objectPosition: photo.position }
              : undefined
          }
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon
            aria-hidden="true"
            strokeWidth={1.25}
            className="h-10 w-10 text-white/30"
          />
        </div>
      )}

      {/* Subtle gradient only at bottom */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0",
          "h-[65%]",
          "bg-gradient-to-t",
          "from-black/75 via-black/20 to-transparent",
        )}
      />

      {/* Text INSIDE the image */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10",
          "p-5 sm:p-6",
        )}
      >
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "font-display font-medium text-white",
                "text-[1.25rem] sm:text-[1.35rem]",
                "leading-[1.25] tracking-[-0.015em]",
              )}
            >
              {service.title}
            </h3>

            {/* <p
              className={cn(
                "mt-1.5 max-w-[44ch]",
                "line-clamp-2 text-[13px]",
                "leading-[1.6] text-white/80",
              )}
            >
              {service.summary}
            </p> */}
          </div>

          {/* <ArrowUpRight
            aria-hidden="true"
            strokeWidth={1.5}
            className={cn(
              "mb-1 h-[18px] w-[18px]",
              "shrink-0 text-white/85",
              "transition-transform duration-300",
              "group-hover:translate-x-0.5",
              "group-hover:-translate-y-0.5",
              "motion-reduce:transition-none",
            )}
          /> */}
        </div>
      </div>
    </Link>
  );
}

export function RecycleShowcase({
  headingId,
}: {
  headingId: string;
}) {
  const featured = services[0];
  const supporting = services.slice(1, 3);
  const remaining = services.slice(3);

  return (
    <section
      aria-labelledby={headingId}
      className="section overflow-hidden bg-paper"
    >
      <div className="container">
        <SectionHead
          id={headingId}
          title="What we recycle"
          lead="Six specialist recovery routes for electronics, batteries, plastics, metals and industrial assets—with documentation at every stage."
          link={{
            href: "/services",
            label: "View all services",
          }}
        />

        {/* Asymmetric main gallery */}
        <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
          {featured && (
            <div className="min-w-0 lg:col-span-7">
              <ServicePanel
                service={featured}
                variant="featured"
              />
            </div>
          )}

          <div
            className={cn(
              "grid min-w-0 gap-4",
              "sm:grid-cols-2",
              "lg:col-span-5 lg:grid-cols-1",
              "lg:grid-rows-2 lg:gap-5",
            )}
          >
            {supporting.map((service) => (
              <ServicePanel
                key={service.slug}
                service={service}
                variant="supporting"
              />
            ))}
          </div>
        </div>

        {/* Three equal image panels */}
        {remaining.length > 0 && (
          <div
            className={cn(
              "mt-4 grid gap-4",
              "sm:grid-cols-2",
              "lg:mt-5 lg:grid-cols-3 lg:gap-5",
            )}
          >
            {remaining.map((service) => (
              <ServicePanel
                key={service.slug}
                service={service}
                variant="standard"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

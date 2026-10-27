
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SectionHead } from "@/components/sections/Blocks";
import { materialPhotos } from "@/content/images";

export function MaterialsGrid() {
  return (
    <>
      <SectionHead
        id="materials-heading"
        title="Materials we recover"
        lead="We separate valuable fractions from discarded products and route them back into authorised recovery and manufacturing."
        link={{
          href: "/services/metal-recovery",
          label: "Explore metal recovery",
        }}
      />

      <ul
        aria-labelledby="materials-heading"
        className="
          grid grid-cols-1
          gap-px overflow-hidden
          border border-line
          bg-line
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        {materialPhotos.map((material) => (
          <li key={material.label} className="min-w-0 bg-paper">
            <Link
              href={material.href}
              className="
                group relative flex h-full min-h-[185px]
                flex-col justify-between overflow-hidden
                bg-paper px-6 py-6
                outline-none
                transition-colors duration-500
                ease-[cubic-bezier(0.22,1,0.36,1)]
                hover:bg-evergreen-950
                focus-visible:bg-evergreen-950
                focus-visible:outline-2
                focus-visible:outline-offset-[-3px]
                focus-visible:outline-evergreen-600
                sm:min-h-[205px] sm:px-8 sm:py-8
                motion-reduce:transition-none
              "
            >
              {/* Top visual indicator */}
              <div className="flex items-start justify-between gap-4">
                <span
                  aria-hidden="true"
                  className="
                    mt-2 block h-[2px] w-7
                    bg-evergreen-700
                    transition-[width,background-color]
                    duration-500
                    ease-[cubic-bezier(0.22,1,0.36,1)]
                    group-hover:w-12
                    group-hover:bg-moss-soft
                    group-focus-visible:w-12
                    group-focus-visible:bg-moss-soft
                    motion-reduce:transition-none
                  "
                />

                <ArrowUpRight
                  aria-hidden="true"
                  size={19}
                  strokeWidth={1.5}
                  className="
                    shrink-0 text-evergreen-700
                    transition-[transform,color]
                    duration-300
                    group-hover:-translate-y-1
                    group-hover:translate-x-1
                    group-hover:text-white
                    group-focus-visible:text-white
                    motion-reduce:transition-none
                  "
                />
              </div>

              {/* Material information */}
              <div className="mt-10">
                <h3
                  className="
                    text-[1.125rem] font-semibold
                    leading-snug tracking-[-0.015em]
                    text-ink
                    transition-colors duration-300
                    group-hover:text-white
                    group-focus-visible:text-white
                    sm:text-[1.25rem]
                  "
                >
                  {material.label}
                </h3>

                <p
                  className="
                    mt-2 max-w-[32ch]
                    text-[15px] font-normal
                    leading-relaxed text-ink-muted
                    transition-colors duration-300
                    group-hover:text-white/70
                    group-focus-visible:text-white/70
                  "
                >
                  {material.caption}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

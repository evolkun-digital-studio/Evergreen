import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SectionHead } from "@/components/sections/Blocks";
import { Photo } from "@/components/Photo";
import { materialPhotos } from "@/content/images";

export function MaterialsGrid() {
  return (
    <>
      <SectionHead
        id="materials-heading"
        title="Materials we recover"
        lead="We separate valuable fractions from discarded products and route them back into authorised recovery and manufacturing."
        link={{ href: "/services/metal-recovery", label: "Explore metal recovery" }}
      />

      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
        {materialPhotos.map(material => (
          <li key={material.label}>
            <Link
              href={material.href}
              className="group block min-h-11 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-evergreen-600"
            >
              <div className="overflow-hidden rounded-xl">
                <Photo
                  photo={material.photo}
                  ratio="4/5"
                  sizes="(min-width: 1280px) 290px, (min-width: 1024px) 23vw, 46vw"
                  className="transition-transform duration-700 ease-[var(--ease-premium)] group-hover:scale-[1.03] motion-reduce:transition-none"
                />
              </div>
              <div className="mt-5 flex items-start justify-between gap-3 border-t border-line pt-4">
                <div className="min-w-0">
                  <h3 className="text-[1.125rem] sm:text-[1.25rem]">
                    {material.label}
                  </h3>
                  <p className="mt-1.5 max-w-[30ch] text-[15px] leading-snug text-ink-muted">
                    {material.caption}
                  </p>
                </div>
                {/* <ArrowUpRight
                  aria-hidden="true"
                  className="mt-1 size-5 shrink-0 text-evergreen-700 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                /> */}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

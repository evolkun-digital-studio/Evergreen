import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/Photo";
import { servicePhotos } from "@/content/images";
import { services } from "@/content/services";

/** Six services in a ruled 3 × 2 grid (no cards), each led by its photo. */
export function ServiceList() {
  return (
    <ul className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-3">
      {services.map(s => {
        const photo = servicePhotos[s.slug];
        return (
          <li key={s.slug} className="border-b border-line sm:odd:border-r lg:border-r lg:[&:nth-child(3n)]:border-r-0">
            <Link href={`/services/${s.slug}`} className="group flex h-full flex-col gap-3 p-6 transition-colors hover:bg-white lg:p-8">
              {photo && (
                <Photo
                  photo={photo}
                  ratio="4/3"
                  sizes="(min-width: 1280px) 330px, (min-width: 1024px) 28vw, (min-width: 640px) 45vw, 90vw"
                  className="mb-2"
                />
              )}
              <h3>{s.title}</h3>
              <p className="text-ink-muted">{s.summary}</p>
              <span className="meta mt-auto inline-flex items-center gap-1.5 pt-2 text-evergreen-700">
                Read more
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

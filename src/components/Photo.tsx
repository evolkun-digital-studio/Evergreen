import Image from "next/image";
import type { Photo as PhotoData } from "@/content/images";
import { cn } from "@/lib/utils";

const ratios = {
  "16/9": "aspect-[16/9]",
  "1/1": "aspect-square",
  "16/10": "aspect-[16/10]",
  "4/3": "aspect-[4/3]",
  "3/2": "aspect-[3/2]",
  "21/9": "aspect-[21/9]",
  fill: "h-full",
  /** 16:9 below xl; at xl it stretches to the height of its grid row. */
  stretch: "aspect-[16/9] xl:aspect-auto xl:min-h-0 xl:flex-1",
} as const;

/**
 * The one photo treatment used across the site: cover-cropped, slightly desaturated, a 6% evergreen
 * overlay and the hero's 12px radius.
 */
export function Photo({
  photo,
  ratio,
  sizes,
  eager = false,
  className,
}: {
  photo: PhotoData;
  ratio: keyof typeof ratios;
  sizes: string;
  /** Above-the-fold photo that is likely the LCP element: load eagerly at high priority. */
  eager?: boolean;
  className?: string;
}) {
  return (
    <figure className={cn(ratio === "fill" && "h-full", ratio === "stretch" && "xl:flex xl:h-full xl:flex-col", className)}>
      <div className={cn("relative overflow-hidden rounded-xl bg-evergreen-950/10", ratios[ratio])}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : undefined}
          placeholder="blur"
          className="object-cover saturate-[0.85]"
          style={photo.position ? { objectPosition: photo.position } : undefined}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-evergreen-700/[0.06]" />
      </div>
    </figure>
  );
}

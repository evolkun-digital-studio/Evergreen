import { pickVariantUrl, srcSet, type MediaItem } from "@/lib/media/types";

/**
 * Responsive <picture> from pre-generated AVIF/WebP variants (no runtime image optimisation).
 * Use `priority` only for the LCP image: it disables lazy loading and sets fetchpriority=high.
 */
export function Picture({
  media,
  alt,
  sizes,
  priority = false,
  className,
  imgClassName,
  title,
}: {
  media: MediaItem;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  title?: string;
}) {
  const { avif, webp } = media.variants;
  return (
    <picture className={className}>
      {avif?.length ? <source type="image/avif" srcSet={srcSet(avif)} sizes={sizes} /> : null}
      {webp?.length ? <source type="image/webp" srcSet={srcSet(webp)} sizes={sizes} /> : null}
      <img
        src={pickVariantUrl(media, 1280)}
        alt={alt}
        title={title || undefined}
        width={media.width || undefined}
        height={media.height || undefined}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        className={imgClassName}
        style={media.blurDataURL ? { backgroundImage: `url(${media.blurDataURL})`, backgroundSize: "cover" } : undefined}
      />
    </picture>
  );
}

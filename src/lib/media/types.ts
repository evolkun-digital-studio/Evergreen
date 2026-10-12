// Client-safe media types and responsive-image helpers.

export type MediaVariant = { width: number; key: string; url: string; size: number };
export type MediaVariants = { avif?: MediaVariant[]; webp?: MediaVariant[]; original?: MediaVariant[] };

export const VARIANT_WIDTHS = [320, 640, 960, 1280, 1920] as const;

/** Minimal media shape needed to render a responsive <picture>. */
export type MediaRef = {
  id: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
  variants: MediaVariants;
  blurDataURL: string;
  alt: string;
};

export const srcSet = (list: MediaVariant[] | undefined) =>
  (list ?? []).map((v) => `${v.url} ${v.width}w`).join(", ");

/** Best single URL for a target width (falls back to the original upload). */
export function pickVariantUrl(media: Pick<MediaRef, "url" | "variants">, targetWidth = 1280): string {
  const list = media.variants.webp?.length ? media.variants.webp : media.variants.original;
  if (!list?.length) return media.url;
  const sorted = [...list].sort((a, b) => a.width - b.width);
  return (sorted.find((v) => v.width >= targetWidth) ?? sorted[sorted.length - 1]).url;
}

/** Media Library item as sent to the admin UI. */
export type MediaItem = MediaRef & {
  originalName: string;
  title: string;
  caption: string;
  description: string;
  sizeBytes: number;
  storageDriver: string;
  createdAt: string;
};


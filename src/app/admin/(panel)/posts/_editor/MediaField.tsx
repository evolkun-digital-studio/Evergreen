"use client";

import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaPicker } from "@/components/admin/media/MediaPicker";
import { pickVariantUrl, type MediaItem } from "@/lib/media/types";

/** Picks a media id from the library and shows a thumbnail. */
export function MediaField({
  value,
  media,
  onChange,
  label,
  hint,
}: {
  value: string | null | undefined;
  media: Map<string, MediaItem>;
  onChange: (item: MediaItem | null) => void;
  label: string;
  hint?: string;
}) {
  const pickMedia = useMediaPicker();
  const item = value ? media.get(value) : undefined;
  return (
    <div className="space-y-2">
      {item ? (
        <div className="relative overflow-hidden rounded-md border border-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pickVariantUrl(item, 640)} alt={item.alt} className="aspect-[1200/630] w-full object-cover" />
          <button
            type="button"
            aria-label={`Remove ${label}`}
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 text-evergreen-700 shadow hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={async () => onChange((await pickMedia()) ?? item ?? null)}>
        <ImagePlus className="size-4" /> {item ? `Replace ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`}
      </Button>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

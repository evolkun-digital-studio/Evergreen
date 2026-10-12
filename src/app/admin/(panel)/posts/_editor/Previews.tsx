"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

// Google truncates desktop titles at ~580px (20px Arial) and descriptions at ~920px (14px Arial).
export const TITLE_MAX_PX = 580;
export const DESC_MAX_PX = 920;

/** Canvas measurement only exists in the browser; render measured values after mount to keep hydration stable. */
const noopSubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

let canvas: HTMLCanvasElement | null = null;
function textWidth(text: string, font: string): number {
  canvas ??= document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return text.length * 9;
  ctx.font = font;
  return Math.round(ctx.measureText(text).width);
}

function truncateToWidth(text: string, maxPx: number, font: string): string {
  if (textWidth(text, font) <= maxPx) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (textWidth(`${text.slice(0, mid)} …`, font) <= maxPx) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo).trimEnd()} …`;
}

export function PixelMeter({ text, maxPx, font, label }: { text: string; maxPx: number; font: string; label: string }) {
  const mounted = useMounted();
  const px = useMemo(() => (mounted ? textWidth(text, font) : 0), [mounted, text, font]);
  const pct = Math.min(100, (px / maxPx) * 100);
  const tone = px === 0 ? "bg-paper-2" : px > maxPx ? "bg-destructive" : px < maxPx * 0.5 ? "bg-amber-500" : "bg-evergreen-700";
  return (
    <div className="space-y-1" aria-label={`${label}: ${px} of ${maxPx} pixels`}>
      <div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {px} / {maxPx}px{px > maxPx ? " (will be truncated in Google)" : ""}
      </p>
    </div>
  );
}

export function SerpPreview({ title, description, url, siteName }: { title: string; description: string; url: string; siteName: string }) {
  const [mobile, setMobile] = useState(false);
  const mounted = useMounted();
  const titleFont = mobile ? "18px Arial" : "20px Arial";
  const descFont = "14px Arial";
  const rawTitle = title || "Add an SEO title";
  const rawDesc = description || "Add a meta description; otherwise Google picks text from the page.";
  const shownTitle = mounted ? truncateToWidth(rawTitle, mobile ? 500 : TITLE_MAX_PX, titleFont) : rawTitle;
  const shownDesc = mounted ? truncateToWidth(rawDesc, DESC_MAX_PX, descFont) : rawDesc;
  const crumbs = url.replace(/^https?:\/\//, "").split("/").filter(Boolean);
  return (
    <div className="space-y-2">
      <div className="flex gap-1 text-xs">
        {(["Desktop", "Mobile"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMobile(m === "Mobile")}
            className={cn("rounded px-2 py-0.5", (m === "Mobile") === mobile ? "bg-evergreen-700 text-white" : "text-evergreen-700 hover:bg-paper-2")}
          >
            {m}
          </button>
        ))}
      </div>
      <div className={cn("rounded-lg border border-line bg-white p-4 font-[Arial,sans-serif]", mobile ? "max-w-[380px]" : "")}>
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-paper-2">
            <Globe className="size-4 text-evergreen-700" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14px] text-[#202124]">{siteName}</p>
            <p className="truncate text-[12px] text-[#4d5156]">{crumbs.join(" › ")}</p>
          </div>
        </div>
        <p className={cn("mt-1.5 text-[#1a0dab]", mobile ? "text-[18px] leading-6" : "text-[20px] leading-[26px]")}>{shownTitle}</p>
        <p className="mt-1 text-[14px] leading-[22px] text-[#4d5156]">{shownDesc}</p>
      </div>
    </div>
  );
}

export function SocialPreview({ title, description, image, domain, card }: { title: string; description: string; image: string | null; domain: string; card: "summary" | "summary_large_image" }) {
  return (
    <div className="space-y-4">
      <figure>
        <figcaption className="mb-1 text-xs font-medium text-muted-foreground">Facebook / LinkedIn</figcaption>
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="aspect-[1200/630] bg-paper-2">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full place-items-center text-xs text-muted-foreground">Generated brand card</span>
            )}
          </div>
          <div className="border-t border-line bg-[#f2f3f5] px-3 py-2">
            <p className="text-[11px] uppercase text-[#606770]">{domain}</p>
            <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#1d2129]">{title}</p>
            <p className="line-clamp-1 text-[13px] text-[#606770]">{description}</p>
          </div>
        </div>
      </figure>
      <figure>
        <figcaption className="mb-1 text-xs font-medium text-muted-foreground">X ({card === "summary" ? "summary card" : "large image card"})</figcaption>
        {card === "summary" ? (
          <div className="flex overflow-hidden rounded-2xl border border-line bg-white">
            <div className="size-24 shrink-0 bg-paper-2">
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 p-3">
              <p className="text-[13px] text-[#536471]">{domain}</p>
              <p className="truncate text-[15px] text-[#0f1419]">{title}</p>
              <p className="line-clamp-2 text-[13px] text-[#536471]">{description}</p>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-line">
            <div className="aspect-[1200/630] bg-paper-2">
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <span className="absolute bottom-2 left-2 max-w-[90%] truncate rounded bg-black/70 px-1.5 py-0.5 text-[12px] text-white">{title}</span>
            <p className="px-1 py-1 text-[13px] text-[#536471]">From {domain}</p>
          </div>
        )}
      </figure>
    </div>
  );
}

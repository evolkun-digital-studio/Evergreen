"use client";

import Image from "next/image";
import { useState } from "react";
import type { Photo } from "@/content/images";
import { cn } from "@/lib/utils";

/**
 * Home "How a pickup works". One large photograph beside a plain numbered list; choosing a step
 * (hover, focus or tap) cross-fades the photograph. No cards, no borders around the picture.
 */
export function PickupSteps({ steps }: { steps: { title: string; photo: Photo }[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-paper-2 lg:col-span-7">
        {steps.map((s, i) => (
          <Image
            key={s.title}
            src={s.photo.src}
            alt={i === active ? s.photo.alt : ""}
            aria-hidden={i === active ? undefined : true}
            fill
            sizes="(min-width: 1280px) 650px, (min-width: 1024px) 55vw, 100vw"
            placeholder="blur"
            className={cn(
              "object-cover transition-opacity duration-500 ease-out motion-reduce:transition-none",
              i === active ? "opacity-100" : "opacity-0",
            )}
            style={s.photo.position ? { objectPosition: s.photo.position } : undefined}
          />
        ))}
        {/* <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold tabular-nums text-evergreen-950 backdrop-blur">
          Step {active + 1}
        </span> */}
      </div>

      <ol aria-label="Pickup steps" className="lg:col-span-5">
        {steps.map((s, i) => {
          const on = i === active;
          return (
            <li key={s.title} className="border-b border-line first:border-t">
              <button
                type="button"
                aria-current={on ? "step" : undefined}
                onClick={() => setActive(i)}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className="group relative flex min-h-16 w-full items-baseline gap-5 py-4 text-left outline-none focus-visible:bg-paper-2 lg:py-5"
              >
                <span
                  className={cn(
                    "w-6 shrink-0 text-[13px]  tabular-nums transition-colors duration-300",
                    on ? "text-evergreen-700" : "text-ink-muted",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "font-display text-[1.0625rem]  leading-snug tracking-[-0.01em] transition-colors duration-300 lg:text-[1.25rem]",
                    on ? "text-evergreen-950" : "text-ink-muted group-hover:text-ink",
                  )}
                >
                  {s.title}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 -bottom-px h-0.5 origin-left bg-evergreen-700 transition-transform duration-500 ease-out motion-reduce:transition-none",
                    on ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

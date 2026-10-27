"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { Photo } from "@/content/images";
import { cn } from "@/lib/utils";

/**
 * Home "How a pickup works". One large photograph beside a plain numbered list; choosing a step
 * (hover, focus or tap) slides the photograph vertically, alternating top-down / bottom-up on each
 * change. No cards, no borders around the picture.
 */
export function PickupSteps({ steps }: { steps: { title: string; photo: Photo }[] }) {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const turn = useRef(0);
  const frames = useRef<(HTMLDivElement | null)[]>([]);

  const show = (next: number) => {
    const prev = activeRef.current;
    if (next === prev) return;
    activeRef.current = next;
    setActive(next);
    // 1 = new photo enters from the top, -1 = from the bottom; flips on every change.
    const dir = turn.current++ % 2 === 0 ? 1 : -1;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const opts: KeyframeAnimationOptions = {
      duration: reduce ? 0 : 720,
      easing: "cubic-bezier(0.65, 0, 0.35, 1)",
      fill: "forwards",
    };
    frames.current.forEach((el, i) => {
      if (!el) return;
      // Freeze any in-flight slide where it is, so quick hovers never jump.
      el.getAnimations().forEach((a) => {
        try { a.commitStyles(); } catch {}
        a.cancel();
      });
      if (i === next) {
        el.animate([{ transform: `translate3d(0, ${-100 * dir}%, 0)` }, { transform: "translate3d(0, 0, 0)" }], opts);
      } else if (i === prev) {
        el.animate([{ transform: getComputedStyle(el).transform === "none" ? "translate3d(0, 0, 0)" : getComputedStyle(el).transform }, { transform: `translate3d(0, ${100 * dir}%, 0)` }], opts);
      } else {
        el.style.transform = "translate3d(0, 100%, 0)";
      }
    });
  };

  return (
    <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-paper-2 lg:col-span-7">
        {steps.map((s, i) => (
          <div
            key={s.title}
            ref={(el) => { frames.current[i] = el; }}
            className="absolute inset-0 will-change-transform"
            style={{ transform: i === 0 ? "translate3d(0, 0, 0)" : "translate3d(0, 100%, 0)" }}
          >
          <Image
            src={s.photo.src}
            alt={i === active ? s.photo.alt : ""}
            aria-hidden={i === active ? undefined : true}
            fill
            sizes="(min-width: 1280px) 650px, (min-width: 1024px) 55vw, 100vw"
            placeholder="blur"
            className="object-cover"
            style={s.photo.position ? { objectPosition: s.photo.position } : undefined}
          />
          </div>
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
                onClick={() => show(i)}
                onMouseEnter={() => show(i)}
                onFocus={() => show(i)}
                className={cn(
                  "group relative -mx-3 flex min-h-16 w-[calc(100%+1.5rem)] items-baseline gap-5 rounded-lg px-3 py-4 text-left outline-none transition-colors duration-300 focus-visible:bg-paper-2 motion-reduce:transition-none lg:py-5",
                  on ? "bg-paper-2" : "hover:bg-paper-2/60",
                )}
              >
                <span
                  className={cn(
                    "font-display text-[1.0625rem]  leading-snug tracking-[-0.01em] transition-colors duration-300 lg:text-[1.25rem]",
                    on ? "text-evergreen-950" : "text-ink-muted group-hover:text-ink",
                  )}
                >
                  {s.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

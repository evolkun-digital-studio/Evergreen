"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Photo } from "@/components/Photo";
import { materialPhotos } from "@/content/images";

export function MaterialsCarousel() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canMoveBack, setCanMoveBack] = useState(false);
  const [canMoveForward, setCanMoveForward] = useState(true);

  const updateControls = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    setCanMoveBack(track.scrollLeft > 2);
    setCanMoveForward(
      track.scrollLeft + track.clientWidth < track.scrollWidth - 2
    );
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    updateControls();
    const observer = new ResizeObserver(updateControls);
    observer.observe(track);
    track.addEventListener("scroll", updateControls, { passive: true });

    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", updateControls);
    };
  }, [updateControls]);

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    const firstSlide = track?.querySelector<HTMLElement>("li");
    if (!track || !firstSlide) return;

    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    track.scrollBy({
      left: direction * (firstSlide.offsetWidth + gap),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <div>
      <div className="mb-5 flex justify-end gap-2">
        <button
          type="button"
          aria-label="Show previous materials"
          aria-controls="materials-carousel"
          disabled={!canMoveBack}
          onClick={() => move(-1)}
          className="grid size-11 place-items-center rounded-full border border-line text-evergreen-950 transition-colors hover:border-evergreen-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="size-5"
          >
            <path
              d="m12.5 4.5-5.5 5.5 5.5 5.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Show next materials"
          aria-controls="materials-carousel"
          disabled={!canMoveForward}
          onClick={() => move(1)}
          className="grid size-11 place-items-center rounded-full border border-line text-evergreen-950 transition-colors hover:border-evergreen-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="size-5"
          >
            <path
              d="m7.5 4.5 5.5 5.5-5.5 5.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <ul
        ref={trackRef}
        id="materials-carousel"
        aria-label="Recovered materials"
        className="scrollbar-hidden grid snap-x snap-mandatory auto-cols-[84%] grid-flow-col gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 sm:auto-cols-[56%] sm:gap-5 lg:auto-cols-[38%] lg:gap-6 xl:auto-cols-[32%]"
      >
        {materialPhotos.map(material => (
          <li key={material.label} className="snap-start">
            <Link href={material.href} className="group block">
              <Photo
                photo={material.photo}
                ratio="16/10"
                sizes="(min-width: 1280px) 380px, (min-width: 1024px) 42vw, (min-width: 640px) 56vw, 84vw"
                className="[&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.025]"
              />
              <div className="flex items-start justify-between gap-4 pt-4">
                <div>
                  <h3 className="text-[1.125rem] font-semibold text-evergreen-950 transition-colors group-hover:text-evergreen-700">
                    {material.label}
                  </h3>
                  <p className="meta mt-1 max-w-[34ch] font-normal leading-relaxed text-ink-muted">
                    {material.caption}
                  </p>
                </div>
                {/* <span
                  aria-hidden="true"
                  className="mt-1 text-[1.125rem] text-evergreen-700 transition-transform group-hover:translate-x-1"
                >
                  →
                </span> */}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

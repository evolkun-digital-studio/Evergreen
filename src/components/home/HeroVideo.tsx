"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

// Footage: Pexels video 29702756 (free licence), trimmed to 12 s, 720p (webm 1.3 MB, mp4 1.4 MB).
// Representative only. The optimised poster <Image> underneath is the LCP element; the <video> is only
// added after the page has loaded and the browser is idle, and never with reduced motion, Save-Data or
// a 2g/3g connection, so it never competes with the poster. It pauses off-screen.
type Conn = { saveData?: boolean; effectiveType?: string };
type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };

/**
 * Full-bleed video banner. `children` is the content column; `facts` is the bottom fact bar's
 * content. The hero is a flex column (header space → content → fact bar), so the bar can never
 * overlap the headline or the buttons: on short screens the hero grows instead.
 */
export function HeroVideo({ children, facts }: { children: React.ReactNode; facts: React.ReactNode }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const conn = (navigator as Navigator & { connection?: Conn }).connection;
    const slow = conn?.saveData === true || /(^|-)(2g|3g)$/.test(conn?.effectiveType ?? "");
    const w = window as IdleWindow;
    let started = false;
    let idleId: number | undefined;
    const start = () => {
      started = true;
      setEnabled(!reduce.matches && !slow);
    };
    const schedule = () => {
      idleId = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 3000 }) : window.setTimeout(start, 1500);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    const update = () => started && setEnabled(!reduce.matches && !slow);
    reduce.addEventListener("change", update);
    return () => {
      window.removeEventListener("load", schedule);
      reduce.removeEventListener("change", update);
      if (idleId !== undefined) (w.cancelIdleCallback ?? window.clearTimeout)(idleId);
    };
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!enabled || !video) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.1 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [enabled]);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      video.play().catch(() => {});
    } else {
      userPaused.current = true;
      video.pause();
    }
  };

  const playing = enabled && ready && !paused;

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative isolate -mt-14 flex min-h-[max(600px,min(100vh,1080px))] supports-[height:100svh]:min-h-[max(600px,min(100svh,1080px))] flex-col overflow-hidden bg-evergreen-950 text-white"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <Image src="/videos/hero-poster.jpg" alt="" fill preload fetchPriority="high" sizes="100vw" className="object-cover saturate-[0.8]" />
        {enabled && (
          <video
            ref={ref}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            poster="/videos/hero-poster.webp"
            onPlaying={() => {
              setReady(true);
              setPaused(false);
            }}
            onPause={() => setPaused(true)}
            className={`absolute inset-0 h-full w-full object-cover saturate-[0.8] transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
          >
            <source src="/videos/hero-720.webm" type="video/webm" />
            <source src="/videos/hero-720.mp4" type="video/mp4" />
          </video>
        )}
        {/* Readability overlays: one vertical gradient on mobile; side + bottom + top fades on desktop. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(10_38_22/0.65),rgb(10_38_22/0.8)_50%,rgb(10_38_22/0.95))] lg:hidden" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(to_right,rgb(10_38_22/0.92),rgb(10_38_22/0.78)_38%,rgb(10_38_22/0.3)_70%,rgb(10_38_22/0.15))] lg:block" />
        <div className="absolute inset-x-0 bottom-0 hidden h-[35%] bg-[linear-gradient(to_top,rgb(10_38_22/0.7),transparent)] lg:block" />
        <div className="absolute inset-x-0 top-0 hidden h-[18%] bg-[linear-gradient(to_bottom,rgb(10_38_22/0.55),transparent)] lg:block" />
      </div>

      {/* Room for the transparent header that sits on top of the hero. */}
      <div aria-hidden="true" className="h-14 flex-none" />

      {/* Content anchored bottom-left: at least 120px below the header, 40/48/64px above the fact bar.
          The hero is min-height only, so if that doesn't fit it grows instead of overlapping. */}
      <div className="container flex flex-1 flex-col justify-end pb-10 pt-[120px] md:pb-12 lg:pb-16">{children}</div>

      <div className="flex-none border-t border-white/[0.14]">
        <div className="container flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          {facts}
          <div className="flex items-center gap-1">
            {/* 44px hit area around the 34px circle. */}
            <button
              type="button"
              onClick={toggle}
              disabled={!enabled || !ready}
              aria-label={playing ? "Pause background video" : "Play background video"}
              className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-white disabled:opacity-50"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full border border-white transition-colors hover:bg-white/10">
                {playing ? <Pause className="h-3 w-3" aria-hidden="true" /> : <Play className="h-3 w-3" aria-hidden="true" />}
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

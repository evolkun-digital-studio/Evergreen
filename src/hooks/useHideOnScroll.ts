"use client";

import { useEffect, useRef, useState } from "react";

const TOP = 80; // always shown above this scroll position
const DOWN_DELTA = 8; // hide only after scrolling down this far in one go

/**
 * Header hide-on-scroll-down / show-on-scroll-up. Returns `hidden` (slide out) and `scrolled`
 * (past 8px, for the bottom border). `pinned` forces it visible (menu or dropdown open, focus inside).
 * Reads the position from Lenis when it is running so both agree; rAF-throttled, passive, and it
 * only sets state when a value actually changes.
 */
export function useHideOnScroll(pinned: boolean) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pinnedRef = useRef(pinned);
  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);

  useEffect(() => {
    let last = window.scrollY;
    let downFrom = last;
    let frame = 0;
    let lenisBound: typeof window.__lenis;
    const hiddenRef = { current: false };

    const update = (y: number) => {
      setScrolled(prev => (prev === y > 8 ? prev : y > 8));
      let next: boolean;
      if (y < TOP || pinnedRef.current) {
        next = false;
        downFrom = y;
      } else if (y > last) {
        next = y - downFrom > DOWN_DELTA ? true : hiddenRef.current;
      } else {
        next = y < last ? false : hiddenRef.current;
        downFrom = y;
      }
      last = y;
      if (next !== hiddenRef.current) {
        hiddenRef.current = next;
        setHidden(next);
      }
    };

    const read = () => (window.__lenis ? window.__lenis.scroll : window.scrollY);
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update(read());
      });
    };
    let poll: number | undefined;
    // Lenis initializes on mount; attach to its scroll event immediately.
    const bindLenis = () => {
      if (window.__lenis && lenisBound !== window.__lenis) {
        lenisBound = window.__lenis;
        lenisBound.on("scroll", onScroll);
        if (poll !== undefined) {
          window.clearInterval(poll);
          poll = undefined;
        }
      }
    };
    bindLenis();
    if (!lenisBound) {
      poll = window.setInterval(bindLenis, 200);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    update(read());
    return () => {
      if (poll !== undefined) window.clearInterval(poll);
      window.removeEventListener("scroll", onScroll);
      lenisBound?.off("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Becoming pinned shows the header immediately.
  const visibleHidden = hidden && !pinned;
  return { hidden: visibleHidden, scrolled };
}

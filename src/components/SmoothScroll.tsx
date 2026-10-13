"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

declare global {
  interface Window {
    /** Set once smooth scrolling has started; the mobile menu stops and restarts it. */
    __lenis?: Lenis;
  }
}

/**
 * Smooth inertial scrolling powered by Lenis.
 * Initializes immediately on mount, handles hash anchors, and respects prefers-reduced-motion.
 */
export function SmoothScroll() {
  return (
    <Suspense fallback={null}>
      <SmoothScrollEffects />
    </Suspense>
  );
}

function SmoothScrollEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1,
      autoRaf: true,
      anchors: true,
      autoToggle: true,
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
    });

    window.__lenis = lenis;

    return () => {
      lenis.destroy();
      if (window.__lenis === lenis) {
        window.__lenis = undefined;
      }
    };
  }, []);

  useEffect(() => {
    if (!window.location.hash && window.__lenis) {
      window.__lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  return null;
}

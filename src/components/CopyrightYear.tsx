"use client";

import { useSyncExternalStore } from "react";

// Server render uses the build year (Cache Components forbids `new Date()` in prerender);
// the client reads the live year.
const subscribe = () => () => {};

export function CopyrightYear() {
  const year = useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => Number(process.env.NEXT_PUBLIC_BUILD_YEAR),
  );
  return <>{year}</>;
}

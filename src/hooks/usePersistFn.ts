import { useRef } from "react";

/** Stable function identity that always calls the latest handler. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any handler signature
export function usePersistFn<T extends (...args: any[]) => unknown>(fn: T) {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T>(null);
  if (!persistFn.current) {
    persistFn.current = function (this: unknown, ...args) {
      return fnRef.current!.apply(this, args);
    } as T;
  }

  return persistFn.current!;
}

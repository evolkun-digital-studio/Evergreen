import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Type guard for `.filter(defined)`: drops null/undefined and narrows the element type. */
export const defined = <T,>(value: T | null | undefined): value is T => value !== null && value !== undefined;

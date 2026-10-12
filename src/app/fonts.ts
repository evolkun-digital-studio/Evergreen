// Franie TEST/trial files from ThatThatType.com — limited character set and trial licence.
// Before going live: buy the Franie web licence, replace these files with the full
// WOFF2 files (same weights), then remove the font-sans symbol workarounds if the
// full version includes ₹ % + @ & : / ' " ( ).
//
// Weights follow the files' OS/2 values, not their names ("SemiLight" is 400, "Regular" 500).
// Light (300) is not used on the site, so it is not loaded (one fewer preload).
import localFont from "next/font/local";
import { Manrope } from "next/font/google";

export const franie = localFont({
  src: [
    { path: "../fonts/franie/FranieVariableTest-SemiLight-BF64c31f3d5484a.woff2", weight: "400", style: "normal" },
    { path: "../fonts/franie/FranieVariableTest-Regular-BF64c31f3d73b64.woff2", weight: "500", style: "normal" },
    { path: "../fonts/franie/FranieVariableTest-SemiBold-BF64c31f3d7b0b9.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-franie",
  display: "swap",
  preload: true,
  fallback: ["Manrope", "system-ui", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

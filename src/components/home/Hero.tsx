import Link from "next/link";
import { HeroVideo } from "./HeroVideo";
import { site } from "@/config/site";
import { capacity, formatTonnes } from "@/content/stats";

const eWaste = capacity.find(c => c.id === "e-waste")!;

/** Home hero: full-bleed video, one left-aligned column, fact bar at the bottom. */
export function Hero() {
  return (
    <HeroVideo
      facts={
        <ul className="flex flex-col gap-1.5 text-[12px] leading-snug text-white/[0.68] lg:flex-row lg:flex-wrap lg:items-center lg:gap-0">
          <li>
            <strong className="font-semibold text-white">UPPCB</strong> authorised
          </li>
          <li className="lg:before:mx-3 lg:before:content-['·']">
            <strong className="font-semibold text-white tabular-nums">{formatTonnes(eWaste.tonnes)}</strong> e-waste capacity a year
          </li>
          <li className="lg:before:mx-3 lg:before:content-['·']">
            <strong className="font-semibold text-white">GSTIN</strong> <span className="tabular-nums">{site.gstin}</span>
          </li>
        </ul>
      }
    >
      <div className="max-w-[520px]">
        <h1
          id="hero-heading"
          className="max-w-[18ch] text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-white lg:text-[36px]"
        >
          Authorised <span className="whitespace-nowrap">e-waste,</span> battery and plastic recycling
        </h1>
        <p className="mt-[14px] text-[15px] leading-[1.5] text-white/[0.78]">
          PAN India pickup. Recycled at our plant in {site.address.locality}, UP.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/contact"
            className="inline-flex h-10 items-center justify-center rounded-[8px] bg-moss px-4 font-display text-[14px] font-semibold text-evergreen-950 transition-colors hover:bg-moss-soft"
          >
            Request a free pickup
          </Link>
          <Link
            href="/services"
            className="inline-flex h-10 items-center justify-center rounded-[8px] border border-white/[0.38] px-4 font-display text-[14px] font-semibold text-white transition-colors hover:border-white/70"
          >
            Our services
          </Link>
        </div>
      </div>
    </HeroVideo>
  );
}

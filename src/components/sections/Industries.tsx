"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { industries } from "@/content/company";
import { industryPhotos, type Photo } from "@/content/images";
import { cn } from "@/lib/utils";

/**
 * Home "Industries we serve". An editorial composition of the four photographed industries — one tall
 * portrait, one wide landscape and two smaller tiles — above a quiet index of all seven. Below `lg`
 * the tiles regroup into a portrait beside two stacked squares, with the landscape spanning beneath.
 * Pointing at an index entry with a photograph lifts its tile, so the list doubles as navigation.
 */
const tiles: { name: string; photo: Photo; className: string; sizes: string }[] = [
  {
    name: "IT companies",
    photo: industryPhotos.it,
    className: "row-span-2 lg:col-span-5 lg:col-start-1 lg:row-start-1",
    sizes: "(min-width: 1280px) 500px, (min-width: 1024px) 40vw, 50vw",
  },
  {
    name: "Manufacturing plants",
    photo: industryPhotos.manufacturing,
    className: "col-span-2 row-start-3 aspect-[16/10] sm:aspect-[21/9] lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:aspect-auto",
    sizes: "(min-width: 1280px) 700px, (min-width: 1024px) 56vw, 100vw",
  },
  {
    name: "Hospitals",
    photo: industryPhotos.hospitals,
    className: "aspect-square sm:aspect-[4/3] lg:col-span-3 lg:col-start-6 lg:row-start-2 lg:aspect-auto",
    sizes: "(min-width: 1280px) 290px, (min-width: 1024px) 24vw, 50vw",
  },
  {
    name: "Construction",
    photo: industryPhotos.construction,
    className: "aspect-square sm:aspect-[4/3] lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:aspect-auto",
    sizes: "(min-width: 1280px) 400px, (min-width: 1024px) 32vw, 50vw",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

const group: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.08 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
};

export function Industries() {
  const [active, setActive] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const reveal = reduce ? {} : { variants: group, initial: "hidden", whileInView: "shown", viewport: { once: true, amount: 0.2 } };
  const item = reduce ? {} : { variants: rise };

  return (
    <div onPointerLeave={() => setActive(null)}>
      <motion.ul
        {...reveal}
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12 lg:grid-rows-[19rem_16rem] lg:gap-5 xl:grid-rows-[21rem_17rem]"
      >
        {tiles.map(({ name, photo, className, sizes }) => (
          <motion.li
            key={name}
            {...item}
            data-active={active === name || undefined}
            onPointerEnter={() => setActive(name)}
            className={cn("group relative overflow-hidden rounded-xl bg-evergreen-950/10", className)}
          >
            <figure className="absolute inset-0 m-0">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes={sizes}
                placeholder="blur"
                className="object-cover saturate-[0.85] transition-transform duration-[900ms] ease-[var(--ease-premium)] group-hover:scale-[1.04] group-data-[active]:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                style={photo.position ? { objectPosition: photo.position } : undefined}
              />
              <div aria-hidden="true" className="absolute inset-0 bg-evergreen-700/[0.06]" />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-evergreen-950/60 to-transparent"
              />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5 lg:p-6">
                <span className="text-[15px] font-medium leading-tight text-white sm:text-base lg:text-lg">{name}</span>
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 shrink-0 translate-y-1 place-items-center rounded-full bg-white text-evergreen-950 opacity-0 transition duration-300 ease-[var(--ease-premium)] group-hover:translate-y-0 group-hover:opacity-100 group-data-[active]:translate-y-0 group-data-[active]:opacity-100 motion-reduce:transition-none sm:h-9 sm:w-9"
                >
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                </span>
              </figcaption>
            </figure>
          </motion.li>
        ))}
      </motion.ul>

      <motion.ul
        {...reveal}
        aria-label="All industries"
        className="mt-10 grid border-t border-line sm:grid-cols-2 sm:gap-x-8 lg:mt-12 lg:grid-cols-7 lg:gap-x-0"
      >
        {industries.map(({ name, icon: Icon }, i) => {
          const hasPhoto = tiles.some(t => t.name === name);
          return (
            <motion.li
              key={name}
              {...item}
              onPointerEnter={() => setActive(hasPhoto ? name : null)}
              className="flex items-center gap-4 border-b border-line py-4 sm:last:col-span-2 lg:flex-col lg:items-start lg:gap-3 lg:border-b-0 lg:border-l lg:px-4 lg:pt-5 lg:first:border-l-0 lg:first:pl-0 lg:last:col-span-1"
            >
              <span className="w-6 text-xs tabular-nums text-ink-muted lg:w-auto">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex flex-1 items-center justify-between gap-3 lg:flex-none lg:flex-col lg:items-start lg:justify-start">
                <span
                  className={cn(
                    "leading-snug text-ink transition-colors duration-200 lg:order-2",
                    active === name && "text-evergreen-700",
                  )}
                >
                  {name}
                </span>
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-evergreen-700 lg:order-1" strokeWidth={1.75} />
              </span>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}

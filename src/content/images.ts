import type { StaticImageData } from "next/image";
import eWaste from "../../public/images/stock/e-waste-circuit-boards.jpg";
import battery from "../../public/images/stock/battery-cells.jpg";
import plastic from "../../public/images/stock/plastic-crushed-bottles.jpg";
import metal from "../../public/images/stock/metal-discarded-phones.jpg";
import industrialScrap from "../../public/images/stock/industrial-scrap-yard.jpg";
import secureDisposal from "../../public/images/stock/secure-disposal-hard-drives.jpg";
import about from "../../public/images/stock/about-pexels-37076702.jpg";
import capacityPhoto from "../../public/images/stock/capacity-eugenia-pankiv.jpg";
import stats from "../../public/images/stock/stats-scrap-pile.jpg";
import process from "../../public/images/stock/process-warehouse-forklift.jpg";
import certs from "../../public/images/stock/certs-document-stamp.jpg";
import sustainability from "../../public/images/stock/sustainability-recycled-flakes.jpg";
import cta from "../../public/images/stock/cta-van-cartons.jpg";
import itServerRoom from "../../public/images/stock/industry-it-server-room.jpg";
import manufacturing from "../../public/images/stock/industry-manufacturing-floor.jpg";
import hospital from "../../public/images/stock/industry-hospital-corridor.jpg";
import construction from "../../public/images/stock/industry-construction-site.jpg";
import liIonCells from "../../public/images/stock/battery-li-ion-cells.webp";
import leadAcid from "../../public/images/stock/battery-lead-acid.webp";
import batteryCollection from "../../public/images/stock/battery-collection-gloved.webp";
import eWasteDismantling from "../../public/images/stock/e-waste-dismantling.webp";
import eWasteBench from "../../public/images/stock/e-waste-bench.webp";
import copperWire from "../../public/images/stock/metal-copper-wire.webp";
import copperStrands from "../../public/images/stock/metal-copper-strands.webp";
import aluminiumCans from "../../public/images/stock/metal-aluminium-cans.webp";
import recoveredScrap from "../../public/images/stock/metal-recovered-scrap.webp";
import metalTubes from "../../public/images/stock/metal-pipes-tubes.webp";
import bottleHeap from "../../public/images/stock/plastic-bottle-heap.webp";
import plasticSorting from "../../public/images/stock/plastic-sorting.webp";
import plasticBales from "../../public/images/stock/plastic-bales.webp";
import plasticFlakes from "../../public/images/stock/plastic-flakes.webp";
import paperwork from "../../public/images/stock/process-paperwork.webp";
import yardAerial from "../../public/images/stock/yard-bales-aerial.webp";
import hddBroken from "../../public/images/stock/secure-hdd-broken.webp";
import craneScrap from "../../public/images/stock/industrial-crane-scrap.webp";
import irfanAhmad from "../../public/images/evergreen/irfan-ahmad.jpg";
import associateDirector from "../../public/images/evergreen/associate-director.jpg";
import mukulAgarwal from "../../public/images/evergreen/mukul.jpg";

/**
 * Site photography. All current files are free-licence stock (see public/images/stock/CREDITS.md);
 * swap a `src` for a file in public/images/evergreen/ when the real photo arrives and set `stock: false`.
 */
export type Photo = {
  src: StaticImageData;
  alt: string;
  /** Stock (representative) image rather than an Evergreen photo. */
  stock: boolean;
  /** CSS object-position, when the subject is off-centre. */
  position?: string;
};

export const photos = {
  about: {
    src: about,
    alt: "Two tractors with trailers parked on a waste ground strewn with mixed plastic, with hills in the background",
    stock: true,
    position: "50% 65%",
  },
  stats: {
    src: stats,
    alt: "A large mound of mixed scrap metal at a recycling yard under a grey sky",
    stock: true,
  },
  process: {
    src: process,
    alt: "A yellow forklift parked outside the loading doors of a large metal-clad warehouse",
    stock: true,
    position: "50% 70%",
  },
  certs: {
    src: certs,
    alt: "A hand pressing an ink stamp onto a paper document on a wooden desk",
    stock: true,
  },
  sustainability: {
    src: sustainability,
    alt: "A hand holding shredded, multicoloured plastic flakes above an open bulk bag of sorted plastic",
    stock: true,
    position: "50% 45%",
  },
  cta: {
    src: cta,
    alt: "Cardboard cartons stacked in the open back of a white van, ready for collection",
    stock: true,
  },
} satisfies Record<string, Photo>;

/** Every other photo on the site, by subject. Services, workflows and strips pick from here. */
export const library = {
  liIonCells: {
    src: liIonCells,
    alt: "Five blue cylindrical lithium-ion cells of the 18650 type lying side by side",
    stock: true,
  },
  leadAcid: {
    src: leadAcid,
    alt: "An orange lead-acid battery with its terminal cover, held down by a bracket",
    stock: true,
    position: "50% 55%",
  },
  batteryCells: {
    src: battery,
    alt: "Close-up of the terminals of several cylindrical battery cells",
    stock: true,
  },
  batteryCollection: {
    src: batteryCollection,
    alt: "A gloved hand placing used batteries into a cardboard collection box",
    stock: true,
  },
  eWasteBoards: {
    src: eWaste,
    alt: "A heap of circuit boards removed from discarded electronics",
    stock: true,
  },
  eWasteDismantling: {
    src: eWasteDismantling,
    alt: "A smartphone taken apart on a repair mat, with its battery, logic board and screen separated",
    stock: true,
  },
  eWasteBench: {
    src: eWasteBench,
    alt: "A workbench with a bench power supply, hand tools and an opened device on a repair mat",
    stock: true,
    position: "50% 70%",
  },
  phones: {
    src: metal,
    alt: "A pile of old mobile phones collected for recovery of copper, gold and silver",
    stock: true,
  },
  copperWire: {
    src: copperWire,
    alt: "Tangled stripped copper wire collected as scrap for recycling",
    stock: true,
  },
  copperStrands: {
    src: copperStrands,
    alt: "Bundles of bare copper wire strands",
    stock: true,
  },
  aluminium: {
    src: aluminiumCans,
    alt: "Rows of plain aluminium cans stacked on their sides",
    stock: true,
  },
  recoveredScrap: {
    src: recoveredScrap,
    alt: "Shiny strips of recovered copper and metal scrap",
    stock: true,
  },
  metalTubes: {
    src: metalTubes,
    alt: "A heap of cut metal pipes and tubes sorted as scrap",
    stock: true,
  },
  industrialScrap: {
    src: industrialScrap,
    alt: "Rusted steel plates and machinery parts piled in a scrap yard beside a crawler crane",
    stock: true,
    position: "50% 80%",
  },
  craneScrap: {
    src: craneScrap,
    alt: "An overhead crane grab lifting scrap metal into a wagon inside a recycling shed",
    stock: true,
  },
  bottleHeap: {
    src: bottleHeap,
    alt: "A large heap of used PET bottles collected for recycling",
    stock: true,
  },
  plasticSorting: {
    src: plasticSorting,
    alt: "Hands sorting plastic bottles, bags and containers into separate sacks",
    stock: true,
  },
  plasticBales: {
    src: plasticBales,
    alt: "Compressed bales of mixed plastic bottles and film stacked for recycling",
    stock: true,
  },
  plasticFlakes: {
    src: plasticFlakes,
    alt: "Shredded blue and green plastic flakes in an open sack",
    stock: true,
    position: "50% 60%",
  },
  plasticGranules: {
    ...photos.sustainability,
    alt: "A hand holding recycled plastic granules above an open bulk bag",
  },
  crushedBottles: {
    src: plastic,
    alt: "Crushed clear and green plastic bottles collected for recycling",
    stock: true,
  },
  hardDrives: {
    src: secureDisposal,
    alt: "Opened hard drives with their platters and read arms exposed",
    stock: true,
  },
  hddBroken: {
    src: hddBroken,
    alt: "Four broken hard drives with their casings opened",
    stock: true,
  },
  paperwork: {
    src: paperwork,
    alt: "A person filling in a checklist on a clipboard in a storeroom",
    stock: true,
  },
  capacity: {
    src: capacityPhoto,
    alt: "A heap of discarded phone chargers, cables, earphones and a circuit board among fallen autumn leaves",
    stock: true,
  },
  yard: {
    src: yardAerial,
    alt: "Aerial view of baled recyclable material stacked in rows on a concrete yard",
    stock: true,
  },
} satisfies Record<string, Photo>;

export type LibraryKey = keyof typeof library;

/**
 * Real Evergreen portraits. Shown without the site photo treatment (no desaturation or tint), so skin
 * tones stay natural. Both are pre-cropped to 4:5 with the eyes about 37% down and similar head size,
 * so the leadership cards line up; `position` only matters if a frame's ratio ever changes.
 */
export const portraits = {
  irfanAhmad: {
    src: irfanAhmad,
    alt: "Irfan Ahmad, Founder and CEO of Ever Green E-Waste Recycling Management",
    stock: false,
    position: "50% 37%",
  },
  pradeepGopalaKrishana: {
    src: associateDirector,
    alt: "Pradeep Gopala Krishana, Associate Director for ESG Compliance at Ever Green E-Waste Recycling Management",
    stock: false,
    position: "50% 37%",
  },
  mukulAgarwal: {
    src: mukulAgarwal,
    alt: "Mukul Agarwal, Strategic Head at Ever Green E-Waste Recycling Management",
    stock: false,
    position: "50% 37%",
  },
} satisfies Record<string, Photo>;

/** Header photo (16:9) per service, keyed by service slug. Also used on the service cards. */
export const servicePhotos: Record<string, Photo> = {
  "e-waste-recycling": library.eWasteBoards,
  "battery-recycling": library.liIonCells,
  "plastic-recycling": library.plasticBales,
  "metal-recovery": library.copperWire,
  "industrial-scrap-management": library.industrialScrap,
  "secure-disposal": library.hardDrives,
};

/** Home "Materials we recover" strip: four 1:1 tiles. */
export const materialPhotos: {
  label: string;
  caption: string;
  photo: Photo;
  href: string;
}[] = [
  {
    label: "Copper",
    caption: "From cables, motors and circuit boards",
    photo: library.copperStrands,
    href: "/services/metal-recovery",
  },
  {
    label: "Aluminium",
    caption: "From casings, frames and cans",
    photo: library.aluminium,
    href: "/services/metal-recovery",
  },
  {
    label: "Plastics",
    caption: "PET, HDPE, PP and ABS, shredded for reuse",
    photo: library.plasticFlakes,
    href: "/services/plastic-recycling",
  },
  {
    label: "Battery materials",
    caption: "From lead-acid and lithium-ion batteries",
    photo: library.batteryCells,
    href: "/services/battery-recycling",
  },
];

/** One photo per step of the five-step process (`steps` in src/content/company.ts), in order. */
export const stepPhotos: Photo[] = [
  library.paperwork,
  photos.process,
  library.hddBroken,
  library.eWasteBench,
  library.eWasteDismantling,
  photos.certs,
];

/** Four of the industries we serve, shown as a strip above the full list. */
export const industryPhotos: Photo[] = [
  {
    src: itServerRoom,
    alt: "Rows of server racks in a data centre",
    stock: true,
  },
  {
    src: manufacturing,
    alt: "Walkway beside a conveyor line on a factory floor",
    stock: true,
    position: "60% 50%",
  },
  { src: hospital, alt: "A long, dimly lit hospital corridor", stock: true },
  {
    src: construction,
    alt: "A tower crane beside a building wrapped in scaffolding",
    stock: true,
    position: "70% 50%",
  },
];

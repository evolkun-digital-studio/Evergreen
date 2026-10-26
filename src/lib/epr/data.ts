/**
 * Typed access to the EPR data in src/data/epr/. Those files are generated from the official
 * PDFs by `npm run epr:data` (scripts/build-epr-data.ts); do not edit them by hand.
 */
import itemsJson from "@/data/epr/eee-items.json";
import compositionJson from "@/data/epr/metal-composition.json";
import targetsJson from "@/data/epr/targets.json";
import goldJson from "@/data/epr/gold-phase-in.json";
import metaJson from "@/data/epr/meta.json";

export type EeeItem = {
  /** Code, plus a sub-type slug when CPCB gives sub-types different average lives (e.g. "ITEW24-up-to-2-kva"). */
  id: string;
  code: string;
  category: string;
  /** Official Schedule I name. */
  name: string;
  /** Sub-type from the average-life list, if any. */
  variant: string | null;
  averageLifeYears: number;
  averageLifeStatus: "final" | "draft";
  averageLifeSource: "life2016" | "lifeDraft";
  compositionVariant: "F.P" | "S.P" | null;
  /** False for solar PV (Schedule III note 3, Schedule IV note 2). */
  targetsApply: boolean;
};

/** Average composition, % by weight, as exact decimal strings; null where Annexure I gives none. */
export type Composition = {
  code: string;
  variant: "F.P" | "S.P" | null;
  au: string | null;
  cu: string | null;
  fe: string | null;
  al: string | null;
};

export type Targets = {
  scheduleIII: { fromYear: string; toYear: string | null; percent: number }[];
  scheduleIV: { filingYear: string; toYear: string | null; percent: number; baseYear: string | null; baseRule: string }[];
  importedUsedEeePercent: number;
  notApplicableCodes: string[];
};

export type Source = {
  key: string;
  file: string;
  title: string;
  issuer: string;
  date: string;
  url: string;
  usedFor: string;
  sha256: string;
};

export type EprData = {
  items: EeeItem[];
  composition: Composition[];
  targets: Targets;
  goldPhaseIn: { filingYear: string; percent: number }[];
  meta: { extractedAt: string; sources: Source[]; notes: string[] };
};

export const eprData: EprData = {
  items: itemsJson as EeeItem[],
  composition: compositionJson as Composition[],
  targets: targetsJson as Targets,
  goldPhaseIn: goldJson,
  meta: metaJson,
};

export const itemLabel = (i: Pick<EeeItem, "name" | "variant">) => (i.variant ? `${i.name}: ${i.variant}` : i.name);

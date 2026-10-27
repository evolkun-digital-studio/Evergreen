/**
 * EPR recycling target and key-metal obligation under the E-Waste (Management) Rules, 2022.
 * Pure functions: no UI, no I/O. All quantities are exact decimals (see ./decimal).
 *
 * `calculate` is the single source of truth for the calculator: every figure the UI, the copied
 * summary and the PDF show comes from its result, and `explain` turns that same result into the
 * "How this was calculated" steps, so the numbers and the explanation cannot disagree.
 */
import { z } from "zod";
import { Dec } from "./decimal";
import { formatFy, parseFy } from "./fy";
import type { Composition, EeeItem, EprData } from "./data";

/** EPR obligations apply from 1 April 2023 (FY 2023-24), rule 1(3) of G.S.R. 801(E). */
export const FIRST_FILING_YEAR = 2023;
/** Last filing year offered. Schedule III note (1): targets are to be reviewed after 2028-29. */
export const LAST_FILING_YEAR = 2030;
export const FIRST_SALES_YEAR = 1990;

/**
 * "producer": manufacturer, brand owner or importer of new EEE (Schedules III and IV).
 * "used-importer": importer of used EEE, 100% of the imported quantity after end of life, if not
 * re-exported (Schedule III note (2)).
 */
export type ProducerType = "producer" | "used-importer";
export type Schedule = "III" | "IV" | "used-import";

export type CalcInput = {
  filingYear: string;
  eeeId: string;
  salesStartYear: string;
  /** Kilograms as typed, up to 4 decimals. */
  quantityKg: string;
  /** Defaults to "producer". */
  producerType?: ProducerType;
  /**
   * The financial year `quantityKg` was entered for. When it no longer matches the year the
   * calculation needs, the quantity is ignored rather than carried over to another year.
   */
  quantityYear?: string;
};

export type FieldErrors = Partial<Record<keyof CalcInput, string>>;

const fyField = (empty: string) =>
  z
    .string()
    .trim()
    .min(1, empty)
    .refine(v => parseFy(v) !== null, "Choose a financial year such as 2025-26.");

const filingYearField = fyField("Choose a filing year.").refine(v => {
  const y = parseFy(v);
  return y === null || (y >= FIRST_FILING_YEAR && y <= LAST_FILING_YEAR);
}, `Choose a filing year from ${formatFy(FIRST_FILING_YEAR)} to ${formatFy(LAST_FILING_YEAR)}.`);

const salesStartField = fyField("Choose the year your sales started.").refine(v => {
  const y = parseFy(v);
  return y === null || y >= FIRST_SALES_YEAR;
}, `Choose a year from ${formatFy(FIRST_SALES_YEAR)} onwards.`);

export const quantityField = z
  .string()
  .trim()
  .min(1, "Enter a quantity of 0 or more.")
  .refine(v => !v.startsWith("-"), "Quantity can't be negative.")
  .refine(v => v.startsWith("-") || /^\d+(\.\d*)?$|^\.\d+$/.test(v), "Enter a number, such as 1250 or 1250.5.")
  .refine(v => !/\.\d{5,}$/.test(v), "Use up to 4 decimal places.")
  .refine(v => v.split(".")[0].replace(/^0+/, "").length <= 15, "That quantity is too large.");

function collect(errors: FieldErrors, key: keyof CalcInput, schema: z.ZodType, value: unknown) {
  const r = schema.safeParse(value);
  if (!r.success) errors[key] ??= r.error.issues[0].message;
}

export type MetalKey = "au" | "cu" | "fe" | "al";
export const METALS: { key: MetalKey; name: string; symbol: string }[] = [
  { key: "au", name: "Gold", symbol: "Au" },
  { key: "cu", name: "Copper", symbol: "Cu" },
  { key: "fe", name: "Iron", symbol: "Fe" },
  { key: "al", name: "Aluminium", symbol: "Al" },
];

export type MetalRow = {
  key: MetalKey;
  name: string;
  symbol: string;
  /** % by weight from Annexure I; null when none is given ("–"). */
  compositionPercent: string | null;
  phaseInPercent: number;
  kg: Dec | null;
};

/** What the calculation needs before a quantity is known. */
export type Plan = {
  item: EeeItem;
  producerType: ProducerType;
  schedule: Schedule;
  filingYear: string;
  /**
   * The financial year whose quantity drives the target: Y−X under Schedule III, the Schedule IV
   * base year, or the filing year for used-EEE imports reaching end of life.
   */
  referenceYear: string;
  /** False when sales started after the reference year: nothing was sold then, so the quantity is 0. */
  salesInReferenceYear: boolean;
  /** Counted inclusively from the sales start year to the filing year; null for used-EEE imports. */
  yearsOfSalesOperations: number | null;
  averageLife: number;
  targetPercent: number;
};

export type PlanResult =
  | { kind: "invalid"; errors: FieldErrors }
  | { kind: "not-applicable"; item: EeeItem; reason: string }
  | ({ kind: "plan" } & Plan);

export type Target = { kind: "target" } & Plan & {
  /** Quantity used in the calculation: the typed figure, or exactly 0 when there were no sales that year. */
  quantityKg: Dec;
  /** The estimated recycling target (EPR obligation) for the filing year. */
  targetKg: Dec;
  metals: MetalRow[];
  notes: string[];
};

export type CalcResult = { kind: "invalid"; errors: FieldErrors } | { kind: "not-applicable"; item: EeeItem; reason: string } | Target;

export function scheduleIIIPercent(data: Pick<EprData, "targets">, filing: number): number {
  const row = data.targets.scheduleIII.find(r => {
    const from = parseFy(r.fromYear)!;
    const to = r.toYear ? parseFy(r.toYear)! : Infinity;
    return filing >= from && filing <= to;
  });
  if (!row) throw new Error(`No Schedule III target for ${formatFy(filing)}`);
  return row.percent;
}

export function scheduleIVRule(data: Pick<EprData, "targets">, filing: number): { percent: number; baseYear: number } {
  const row = data.targets.scheduleIV.find(r => {
    const from = parseFy(r.filingYear)!;
    const to = r.toYear ? parseFy(r.toYear)! : Infinity;
    return filing >= from && filing <= to;
  });
  if (!row) throw new Error(`No Schedule IV target for ${formatFy(filing)}`);
  // "Two years back" when the Gazette gives no fixed base year.
  return { percent: row.percent, baseYear: row.baseYear ? parseFy(row.baseYear)! : filing - 2 };
}

/** Gold phase-in for the filing year; the last listed value continues in later years. */
export function goldPhaseInPercent(data: Pick<EprData, "goldPhaseIn">, filing: number): number {
  const rows = [...data.goldPhaseIn].sort((a, b) => parseFy(a.filingYear)! - parseFy(b.filingYear)!);
  let pct = 0;
  for (const r of rows) if (parseFy(r.filingYear)! <= filing) pct = r.percent;
  return pct;
}

export function compositionFor(data: Pick<EprData, "composition">, item: EeeItem): Composition {
  const row = data.composition.find(c => c.code === item.code && c.variant === item.compositionVariant);
  if (!row) throw new Error(`No Annexure I composition for ${item.id}`);
  return row;
}

/** Schedule, reference year and percentage for the inputs, without the quantity. */
export function plan(input: CalcInput, data: EprData): PlanResult {
  const producerType = input.producerType ?? "producer";
  const errors: FieldErrors = {};
  collect(errors, "filingYear", filingYearField, input.filingYear);
  collect(errors, "eeeId", z.string().trim().min(1, "Choose an EEE item."), input.eeeId);
  if (!errors.eeeId && !data.items.some(i => i.id === input.eeeId)) errors.eeeId = "Choose an EEE item from the list.";
  if (producerType === "producer") {
    collect(errors, "salesStartYear", salesStartField, input.salesStartYear);
    const filing = parseFy(input.filingYear);
    const start = parseFy(input.salesStartYear);
    if (!errors.salesStartYear && filing !== null && start !== null && start > filing) {
      errors.salesStartYear = "Sales start year can't be after the filing year.";
    }
  }
  if (Object.keys(errors).length) return { kind: "invalid", errors };

  const item = data.items.find(i => i.id === input.eeeId)!;
  if (!item.targetsApply) {
    return {
      kind: "not-applicable",
      item,
      reason: "The E-Waste (Management) Rules, 2022 set no recycling target for waste from solar photovoltaic panels, cells or modules (Schedule III note 3, Schedule IV note 2).",
    };
  }

  const filing = parseFy(input.filingYear)!;
  const averageLife = item.averageLifeYears;
  const base = { item, producerType, filingYear: formatFy(filing), averageLife };

  if (producerType === "used-importer") {
    return { kind: "plan", ...base, schedule: "used-import", referenceYear: formatFy(filing), salesInReferenceYear: true, yearsOfSalesOperations: null, targetPercent: 100 };
  }

  const start = parseFy(input.salesStartYear)!;
  const yearsOfSalesOperations = filing - start + 1;
  // Schedule IV note (1): once years of sales operations equal the average life, Schedule III applies.
  if (yearsOfSalesOperations >= averageLife) {
    const ref = filing - averageLife;
    return { kind: "plan", ...base, schedule: "III", referenceYear: formatFy(ref), salesInReferenceYear: ref >= start, yearsOfSalesOperations, targetPercent: scheduleIIIPercent(data, filing) };
  }
  const rule = scheduleIVRule(data, filing);
  return { kind: "plan", ...base, schedule: "IV", referenceYear: formatFy(rule.baseYear), salesInReferenceYear: rule.baseYear >= start, yearsOfSalesOperations, targetPercent: rule.percent };
}

export function calculate(input: CalcInput, data: EprData): CalcResult {
  const p = plan(input, data);
  if (p.kind !== "plan") return p;
  const pl: Plan = p;

  let quantityKg = Dec.ZERO;
  if (pl.salesInReferenceYear) {
    const errors: FieldErrors = {};
    if (input.quantityYear && input.quantityYear !== pl.referenceYear) {
      errors.quantityKg = `Enter the quantity for ${pl.referenceYear}.`;
    } else {
      collect(errors, "quantityKg", quantityField, input.quantityKg);
    }
    if (errors.quantityKg) return { kind: "invalid", errors };
    const q = input.quantityKg.trim();
    quantityKg = Dec.parse(q.startsWith(".") ? `0${q}` : q.replace(/\.$/, ""));
  }

  const targetKg = quantityKg.mul(Dec.int(pl.targetPercent).percent());
  const filing = parseFy(pl.filingYear)!;
  const notes: string[] = [];
  if (!pl.salesInReferenceYear) {
    notes.push(`No sales recorded for ${pl.referenceYear}: sales started in ${input.salesStartYear}, after the reference sales year, so the reference quantity and the recycling target are 0 kg.`);
  }
  if (pl.schedule === "used-import") {
    notes.push("Importers of used EEE carry a 100% EPR obligation for the imported material after end of life, if it is not re-exported (Schedule III note 2). Enter the quantity reaching end of life in the filing year; CPCB fixes that timing on the EPR portal.");
  }
  if (filing > 2028) notes.push("Schedule III note (1): targets are to be reviewed after 2028-29 and may be increased.");
  if (pl.item.averageLifeStatus === "draft") notes.push("This item's average life is from CPCB's draft list of 21 March 2023; no final list has been published.");

  const comp = compositionFor(data, pl.item);
  const goldPct = goldPhaseInPercent(data, filing);
  // CPCB framework (21 Sep 2023), paragraphs 6 and 8: key metal = target × Annexure I % × phase-in
  // (gold only; copper, iron and aluminium are 100%).
  const metals: MetalRow[] = METALS.map(m => {
    const compositionPercent = comp[m.key];
    const phaseInPercent = m.key === "au" ? goldPct : 100;
    const kg = compositionPercent === null ? null : targetKg.mul(Dec.parse(compositionPercent).percent()).mul(Dec.int(phaseInPercent).percent());
    return { ...m, compositionPercent, phaseInPercent, kg };
  });

  return { ...p, kind: "target", quantityKg, targetKg, metals, notes };
}

/** The quantity the user should enter next, or why none is needed. Drives the quantity field. */
export function quantityFieldFor(p: PlanResult): { year: string; label: string; disabled: boolean } | null {
  if (p.kind !== "plan") return null;
  if (p.schedule === "used-import") return { year: p.referenceYear, label: `Used EEE imported and reaching end of life in ${p.referenceYear} (kg)`, disabled: false };
  const label = p.schedule === "III" ? `EEE placed on the market in ${p.referenceYear} (kg)` : `Sales in ${p.referenceYear} (kg)`;
  return { year: p.referenceYear, label, disabled: !p.salesInReferenceYear };
}

export const scheduleName = (s: Schedule) => (s === "used-import" ? "Used EEE imports" : `Schedule ${s}`);

/**
 * The calculation as numbered steps. Every figure comes from `r`, so these always match the result
 * tiles. `fmt` formats kilograms.
 */
export function explain(r: Target, input: Pick<CalcInput, "salesStartYear">, fmt: (d: Dec) => string): string[] {
  const steps: string[] = [];
  if (r.schedule === "used-import") {
    steps.push(`Importer of used EEE: Schedule III note (2) sets a 100% obligation for imported material after end of life, if not re-exported.`);
    steps.push(`Quantity reaching end of life in ${r.referenceYear}: ${fmt(r.quantityKg)} kg.`);
  } else {
    steps.push(`Years of sales operations: ${input.salesStartYear} to ${r.filingYear}, counted inclusively = ${r.yearsOfSalesOperations}.`);
    steps.push(
      r.schedule === "III"
        ? `${r.yearsOfSalesOperations} ≥ average life ${r.averageLife}, so Schedule III applies. Reference year = ${r.filingYear} − ${r.averageLife} years (Y − X) = ${r.referenceYear}.`
        : `${r.yearsOfSalesOperations} < average life ${r.averageLife}, so Schedule IV applies. Reference sales year for ${r.filingYear} = ${r.referenceYear}.`,
    );
    steps.push(
      r.salesInReferenceYear
        ? `Quantity in ${r.referenceYear}: ${fmt(r.quantityKg)} kg.`
        : `Sales started in ${input.salesStartYear}, after ${r.referenceYear}. No sales recorded for that financial year, so the quantity is 0 kg.`,
    );
  }
  steps.push(`Recycling target = ${fmt(r.quantityKg)} kg × ${r.targetPercent}% = ${fmt(r.targetKg)} kg.`);
  return steps;
}

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
  /**
   * Sales history: kilograms as typed (up to 4 decimals), keyed by financial year. Only the
   * reference year's entry is used, so a figure entered for one year never stands in for another.
   */
  sales: Record<string, string>;
  /**
   * Importers of used EEE: kilograms reaching end of life, keyed by filing year. Kept apart from
   * `sales` so a new-EEE sales figure is never read as a used-EEE quantity, or the other way round.
   */
  usedEee?: Record<string, string>;
  /** Defaults to "producer". */
  producerType?: ProducerType;
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

/**
 * Everything is valid but the quantity the calculation needs has not been entered yet. This is a
 * neutral state, not an error, and the empty field is not read as 0.
 */
export type Incomplete = { kind: "incomplete" } & Plan & { field: "sales" | "usedEee" };

export type CalcResult = { kind: "invalid"; errors: FieldErrors } | { kind: "not-applicable"; item: EeeItem; reason: string } | Incomplete | Target;

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

  // Only a regulatory zero (no sales in the reference year) is automatic. An empty field is
  // "not entered yet", never 0.
  let quantityKg = Dec.ZERO;
  if (pl.salesInReferenceYear) {
    const field = pl.schedule === "used-import" ? "usedEee" : "sales";
    const typed = (field === "usedEee" ? input.usedEee?.[pl.referenceYear] : input.sales[pl.referenceYear]) ?? "";
    if (typed.trim() === "") return { ...p, kind: "incomplete", field };
    const errors: FieldErrors = {};
    collect(errors, field, quantityField, typed);
    if (errors[field]) return { kind: "invalid", errors };
    quantityKg = parseQuantity(typed);
  }

  const targetKg = quantityKg.mul(Dec.int(pl.targetPercent).percent());
  const filing = parseFy(pl.filingYear)!;
  const notes: string[] = [];
  if (!pl.salesInReferenceYear) {
    notes.push(`${noSalesMessage(pl.referenceYear, input.salesStartYear)} The reference quantity and the recycling target are 0 kg.`);
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

/** Parses a quantity that has passed `quantityField` validation (".5" and "5." are allowed). */
export function parseQuantity(typed: string): Dec {
  const q = typed.trim();
  return Dec.parse(q.startsWith(".") ? `0${q}` : q.replace(/\.$/, ""));
}

export const noSalesMessage = (year: string, start: string) => `No sales in ${year} because operations started in ${start}.`;

/** One row of the sales history form. */
export type SalesRow = {
  year: string;
  label: string;
  /** The Schedule III or IV reference year this filing's target is based on (badged in the form). */
  reference: boolean;
  /** False for years before sales began: nothing can be entered, and the row explains why. */
  applicable: boolean;
};

/**
 * The sales history rows to show: the reference year, plus any other year that already holds a
 * figure (kept, but not used for this filing). Newest first.
 */
export function salesRows(p: PlanResult, input: Pick<CalcInput, "sales" | "salesStartYear">): SalesRow[] {
  if (p.kind !== "plan") return [];
  // Used-EEE imports: a single quantity for the filing year, not a sales history.
  if (p.schedule === "used-import") {
    return [{ year: p.referenceYear, label: `Used EEE reaching end of life in FY ${p.referenceYear} (kg)`, reference: false, applicable: true }];
  }
  const start = parseFy(input.salesStartYear);
  const years = new Set([p.referenceYear, ...Object.keys(input.sales).filter(y => parseFy(y) !== null && input.sales[y] !== "")]);
  return [...years]
    .sort((a, b) => parseFy(b)! - parseFy(a)!)
    .map(year => {
      const reference = year === p.referenceYear;
      const label = reference && p.schedule === "III" ? `EEE placed on the market in ${year} (kg)` : `Sales in ${year} (kg)`;
      const applicable = start === null || parseFy(year)! >= start;
      return { year, label, reference, applicable };
    });
}

export const scheduleName = (s: Schedule) => (s === "used-import" ? "Schedule III note (2): used EEE imports" : `Schedule ${s}`);

/** What `referenceYear` means for the schedule: a sales year, or the year used EEE is assessed at end of life. */
export const yearLabel = (s: Schedule) => (s === "used-import" ? "End-of-life assessment year" : "Reference sales year");

/** The provision of the E-Waste (Management) Rules, 2022 (G.S.R. 801(E)) that sets this target. */
export function legalProvision(s: Schedule): string {
  const rules = "E-Waste (Management) Rules, 2022 (G.S.R. 801(E)), rule 13 read with";
  if (s === "used-import") return `${rules} Schedule III, note (2): importers of used EEE have a 100% EPR obligation for the imported material after end of life, if not re-exported`;
  if (s === "III") return `${rules} Schedule III: a percentage of the quantity of an EEE placed in the market in year Y − X, where X is the average life of that product`;
  return `${rules} Schedule IV, for producers whose years of sales operations are less than the average life of the product (note (1) moves them to Schedule III once the two are equal)`;
}

/** The formula behind the recycling target, in words. */
export function targetFormula(r: Pick<Plan, "schedule" | "referenceYear" | "targetPercent">): string {
  if (r.schedule === "used-import") return `Recycling target = used EEE reaching end of life in FY ${r.referenceYear} and not re-exported × 100%`;
  if (r.schedule === "III") return `Recycling target = EEE placed on the market in ${r.referenceYear} (Y − X) × ${r.targetPercent}%`;
  return `Recycling target = sales in ${r.referenceYear} × ${r.targetPercent}%`;
}

export const METAL_FORMULA = "Key metal (kg) = recycling target × Annexure I composition % × phase-in % (phase-in applies to gold only; CPCB framework of 21 September 2023, paragraphs 6 and 8)";

/**
 * The calculation as numbered steps. Every figure comes from `r`, so these always match the result
 * tiles. `fmt` formats kilograms.
 */
export function explain(r: Target, input: Pick<CalcInput, "salesStartYear">, fmt: (d: Dec) => string): string[] {
  const steps: string[] = [];
  if (r.schedule === "used-import") {
    steps.push(`Importer of used EEE: Schedule III note (2) sets a 100% obligation for imported material after end of life, if not re-exported.`);
    steps.push(`End-of-life assessment year = the filing year, ${r.referenceYear}.`);
    steps.push(`Used EEE reaching end of life in FY ${r.referenceYear} and not re-exported: ${fmt(r.quantityKg)} kg.`);
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
        : `${noSalesMessage(r.referenceYear, input.salesStartYear)} The quantity is 0 kg.`,
    );
  }
  steps.push(`Recycling target = ${fmt(r.quantityKg)} kg × ${r.targetPercent}% = ${fmt(r.targetKg)} kg.`);
  return steps;
}

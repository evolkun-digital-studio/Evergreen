/**
 * EPR recycling target and key-metal obligation under the E-Waste (Management) Rules, 2022.
 * Pure functions: no UI, no I/O. All quantities are exact decimals (see ./decimal).
 */
import { z } from "zod";
import { Dec } from "./decimal";
import { formatFy, parseFy } from "./fy";
import type { Composition, EeeItem, EprData } from "./data";

/** EPR obligations apply from 1 April 2023 (FY 2023-24). */
export const FIRST_FILING_YEAR = 2023;
/** Last filing year offered. Schedule III targets are due for review after 2028-29. */
export const LAST_FILING_YEAR = 2030;
export const FIRST_SALES_YEAR = 1990;

export type CalcInput = {
  filingYear: string;
  eeeId: string;
  salesStartYear: string;
  /** Kilograms as typed, up to 4 decimals. */
  quantityKg: string;
};

export type FieldErrors = Partial<Record<keyof CalcInput, string>>;

const fyField = (empty: string) =>
  z
    .string()
    .trim()
    .min(1, empty)
    .refine(v => parseFy(v) !== null, "Choose a financial year such as 2025-26.");

export const inputSchema = z
  .object({
    filingYear: fyField("Choose a filing year.").refine(v => {
      const y = parseFy(v);
      return y === null || (y >= FIRST_FILING_YEAR && y <= LAST_FILING_YEAR);
    }, `Choose a filing year from ${formatFy(FIRST_FILING_YEAR)} to ${formatFy(LAST_FILING_YEAR)}.`),
    eeeId: z.string().trim().min(1, "Choose an EEE item."),
    salesStartYear: fyField("Choose the year your sales started.").refine(v => {
      const y = parseFy(v);
      return y === null || y >= FIRST_SALES_YEAR;
    }, `Choose a year from ${formatFy(FIRST_SALES_YEAR)} onwards.`),
    quantityKg: z
      .string()
      .trim()
      .min(1, "Enter a quantity of 0 or more.")
      .refine(v => /^\d+(\.\d*)?$|^\.\d+$/.test(v), "Enter a quantity of 0 or more.")
      .refine(v => !/\.\d{5,}$/.test(v), "Use up to 4 decimal places.")
      .refine(v => v.split(".")[0].replace(/^0+/, "").length <= 15, "That quantity is too large."),
  })
  .superRefine((v, ctx) => {
    const filing = parseFy(v.filingYear);
    const start = parseFy(v.salesStartYear);
    if (filing !== null && start !== null && start > filing) {
      ctx.addIssue({ code: "custom", path: ["salesStartYear"], message: "Sales start year can't be after the filing year." });
    }
  });

export function validate(input: CalcInput, data: Pick<EprData, "items">): { ok: true } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CalcInput;
      errors[key] ??= issue.message;
    }
  }
  if (!errors.eeeId && input.eeeId && !data.items.some(i => i.id === input.eeeId)) errors.eeeId = "Choose an EEE item from the list.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
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

export type CalcResult =
  | { kind: "invalid"; errors: FieldErrors }
  | { kind: "not-applicable"; item: EeeItem; reason: string }
  | {
      kind: "target";
      item: EeeItem;
      schedule: "III" | "IV";
      yearsOfSalesOperations: number;
      averageLife: number;
      /** Schedule III: filing year − average life. Schedule IV: the base sales year. */
      targetYear: string;
      targetPercent: number;
      quantityKg: Dec;
      /** The recycling target (EPR obligation) for this filing. */
      targetKg: Dec;
      /** Schedule IV obligation for the filing year; 0 under Schedule III. */
      filingYearTargetKg: Dec;
      metals: MetalRow[];
      notes: string[];
    };

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

export function calculate(input: CalcInput, data: EprData): CalcResult {
  const v = validate(input, data);
  if (!v.ok) return { kind: "invalid", errors: v.errors };

  const item = data.items.find(i => i.id === input.eeeId)!;
  if (!item.targetsApply) {
    return {
      kind: "not-applicable",
      item,
      reason: "The E-Waste (Management) Rules, 2022 set no recycling target for waste from solar photovoltaic panels, cells or modules (Schedule III note 3, Schedule IV note 2).",
    };
  }

  const filing = parseFy(input.filingYear)!;
  const start = parseFy(input.salesStartYear)!;
  const quantityKg = Dec.parse(input.quantityKg.startsWith(".") ? `0${input.quantityKg}` : input.quantityKg.replace(/\.$/, ""));
  const yearsOfSalesOperations = filing - start + 1;
  const averageLife = item.averageLifeYears;
  const notes: string[] = [];

  let schedule: "III" | "IV";
  let targetYear: number;
  let targetPercent: number;
  let targetKg: Dec;
  let filingYearTargetKg: Dec;

  // Schedule IV note (1): once years of sales operations equal the average life, Schedule III applies.
  if (yearsOfSalesOperations >= averageLife) {
    schedule = "III";
    targetYear = filing - averageLife;
    targetPercent = scheduleIIIPercent(data, filing);
    targetKg = quantityKg.mul(Dec.int(targetPercent).percent());
    filingYearTargetKg = Dec.ZERO;
    if (targetYear < start) {
      notes.push(`Sales started in ${formatFy(start)}, after the target year ${formatFy(targetYear)}. If nothing was placed on the market in ${formatFy(targetYear)}, the quantity is 0.`);
    }
  } else {
    schedule = "IV";
    const rule = scheduleIVRule(data, filing);
    targetYear = rule.baseYear;
    targetPercent = rule.percent;
    filingYearTargetKg = quantityKg.mul(Dec.int(targetPercent).percent());
    targetKg = filingYearTargetKg;
    if (targetYear < start) {
      notes.push(`Sales started in ${formatFy(start)}, after the base year ${formatFy(targetYear)}, so there were no sales that year and the target is 0.`);
    }
  }
  if (filing > 2028) notes.push("Schedule III note (1): targets are to be reviewed after 2028-29 and may be increased.");
  if (item.averageLifeStatus === "draft") notes.push("This item's average life is from CPCB's draft list of March 2023.");

  const comp = compositionFor(data, item);
  const goldPct = goldPhaseInPercent(data, filing);
  const metals: MetalRow[] = METALS.map(m => {
    const compositionPercent = comp[m.key];
    const phaseInPercent = m.key === "au" ? goldPct : 100;
    const kg = compositionPercent === null ? null : targetKg.mul(Dec.parse(compositionPercent).percent()).mul(Dec.int(phaseInPercent).percent());
    return { ...m, compositionPercent, phaseInPercent, kg };
  });

  return {
    kind: "target",
    item,
    schedule,
    yearsOfSalesOperations,
    averageLife,
    targetYear: formatFy(targetYear),
    targetPercent,
    quantityKg,
    targetKg,
    filingYearTargetKg,
    metals,
    notes,
  };
}

/**
 * The year whose quantity the user should enter, before a full calculation is possible
 * (drives the quantity label and helper text). Null until year, item and sales start are known.
 */
export function quantityYearFor(
  input: Pick<CalcInput, "filingYear" | "eeeId" | "salesStartYear">,
  data: EprData,
): { schedule: "III" | "IV"; year: string } | null {
  const filing = parseFy(input.filingYear);
  const start = parseFy(input.salesStartYear);
  const item = data.items.find(i => i.id === input.eeeId);
  if (filing === null || start === null || !item || start > filing || !item.targetsApply) return null;
  if (filing - start + 1 >= item.averageLifeYears) return { schedule: "III", year: formatFy(filing - item.averageLifeYears) };
  try {
    return { schedule: "IV", year: formatFy(scheduleIVRule(data, filing).baseYear) };
  } catch {
    return null;
  }
}

/** Plain-language summary of a calculation, shared by "Copy results" and the PDF download. */
import { METAL_FORMULA, explain, legalProvision, noSalesMessage, scheduleName, targetFormula, yearLabel, type CalcInput, type Target } from "./calculate";
import { regulatoryStatus, shortLabel, type EprData } from "./data";
import { groupIndian, type Dec } from "./decimal";

const trimZeros = (fixed: string) => (fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed);

/** Kilograms with Indian digit grouping and up to 4 decimals, only where needed: "1,200", "185.1852". */
export const fmtKg = (d: Pick<Dec, "toFixed">) => groupIndian(trimZeros(d.toFixed(4)));

/**
 * Key-metal kilograms. Gold obligations are often far below 0.0001 kg, so values under 0.01 kg keep
 * three significant digits (up to 10 decimals) instead of rounding to 0.
 */
export function fmtMetalKg(d: Pick<Dec, "toFixed" | "isZero">): string {
  if (d.isZero()) return "0";
  const four = d.toFixed(4);
  if (Number(four) >= 0.01) return fmtKg(d);
  const ten = d.toFixed(10);
  const firstSig = ten.slice(2).search(/[1-9]/);
  if (firstSig === -1) return "< 0.0000000001";
  return trimZeros(d.toFixed(Math.min(10, Math.max(4, firstSig + 3))));
}

export const DISCLAIMER = "This is an estimate to help with planning, not an official assessment. Final obligations are subject to CPCB EPR portal assessment and regulatory updates.";

export const TRANSPARENCY = "Calculations are based on the applicable E-Waste (Management) Rules and CPCB guidelines. Final obligations are subject to official CPCB portal assessment and regulatory updates.";

export function scheduleLine(r: Target): string {
  if (r.schedule === "used-import") return `Schedule III note (2): 100% of used EEE reaching end of life in ${r.filingYear}`;
  return r.schedule === "III"
    ? `Schedule III: ${r.targetPercent}% of ${r.referenceYear} quantity for ${r.filingYear}`
    : `Schedule IV: ${r.targetPercent}% of ${r.referenceYear} sales for ${r.filingYear}`;
}

export type Summary = {
  inputs: [string, string][];
  results: [string, string][];
  /** Legal provision and formulas. */
  basis: [string, string][];
  metals: [string, string, string, string][];
  steps: string[];
  notes: string[];
};

export function buildSummary(input: CalcInput, r: Target): Summary {
  const used = r.schedule === "used-import";
  const quantityLabel = used
    ? `Used EEE reaching end of life in FY ${r.referenceYear} (not re-exported)`
    : r.schedule === "III"
      ? `EEE placed on the market in ${r.referenceYear}`
      : `Sales in ${r.referenceYear}`;
  const rows = (...pairs: ([string, string] | false)[]) => pairs.filter((x): x is [string, string] => x !== false);
  return {
    inputs: rows(
      ["Filing year", r.filingYear],
      ["Producer type", used ? "Importer of used EEE" : "Producer (manufacturer, brand owner or importer of new EEE)"],
      ["EEE code", r.item.code],
      ["Equipment", r.item.name],
      // ITEW1 and other codes cover more than one product with different average lives.
      !!r.item.variant && ["Subcategory", r.item.variant],
      !used && ["Sales started in", input.salesStartYear],
      [quantityLabel, r.salesInReferenceYear ? `${fmtKg(r.quantityKg)} kg` : `${noSalesMessage(r.referenceYear, input.salesStartYear)} (0 kg)`],
    ),
    results: rows(
      ["Applicable schedule", scheduleName(r.schedule)],
      ["Estimated recycling target", `${fmtKg(r.targetKg)} kg`],
      ["Filing year", r.filingYear],
      [yearLabel(r.schedule), r.referenceYear],
      r.yearsOfSalesOperations !== null && ["Years of sales operations", String(r.yearsOfSalesOperations)],
      ["EEE average life (years)", `${r.averageLife} (${shortLabel(r.item)}${r.item.averageLifeStatus === "draft" ? ", CPCB draft list" : ""})`],
      ["Applicable target percentage", `${r.targetPercent}%`],
    ),
    basis: [
      ["Legal provision", legalProvision(r.schedule)],
      ["Target formula", targetFormula(r)],
      ["Key-metal formula", METAL_FORMULA],
    ],
    metals: r.metals.map(m => [
      `${m.name} (${m.symbol})`,
      m.compositionPercent === null ? "–" : `${m.compositionPercent}%`,
      `${m.phaseInPercent}%`,
      m.kg === null ? "–" : `${fmtMetalKg(m.kg)} kg`,
    ]),
    steps: explain(r, input, fmtKg),
    notes: r.notes,
  };
}

export function summaryText(s: Summary, data: Pick<EprData, "meta">, url?: string): string {
  const pad = (rows: [string, string][]) => rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  return [
    `E-waste EPR estimate (${regulatoryStatus.regulation})`,
    "",
    pad(s.inputs),
    "",
    pad(s.results),
    "",
    pad(s.basis),
    "",
    "How this was calculated",
    ...s.steps.map((step, i) => `${i + 1}. ${step}`),
    "",
    "Key-metal quantities for EPR certificates (derived from the recycling target, not in addition to it)",
    ...s.metals.map(([m, c, p, q]) => `${m}: ${q} (composition ${c}, phase-in ${p})`),
    ...(s.notes.length ? ["", ...s.notes] : []),
    "",
    `Sources: ${data.meta.sources.filter(x => !x.key.startsWith("amendment") && x.key !== "portalFaq").map(x => `${x.issuer}, ${x.title} (${x.date})`).join("; ")}.`,
    `Regulatory data last verified ${regulatoryStatus.lastVerified}.`,
    DISCLAIMER,
    ...(url ? ["", url] : []),
  ].join("\n");
}

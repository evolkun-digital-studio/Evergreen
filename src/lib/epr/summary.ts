/** Plain-language summary of a calculation, shared by "Copy results" and the PDF download. */
import type { CalcInput, CalcResult } from "./calculate";
import { itemLabel, type EprData } from "./data";
import { groupIndian } from "./decimal";

export const fmtKg = (d: { toFixed(dp?: number): string }) => groupIndian(d.toFixed(4));

export const DISCLAIMER = "This is an estimate to help with planning. Confirm your obligation on the CPCB EPR portal.";

export function scheduleLine(r: Extract<CalcResult, { kind: "target" }>, filingYear: string): string {
  return r.schedule === "III"
    ? `Schedule III: ${r.targetPercent}% for ${filingYear}`
    : `Schedule IV: ${r.targetPercent}% of ${r.targetYear} sales for ${filingYear}`;
}

export type Summary = {
  inputs: [string, string][];
  results: [string, string][];
  metals: [string, string, string, string][];
  notes: string[];
};

export function buildSummary(input: CalcInput, r: Extract<CalcResult, { kind: "target" }>): Summary {
  return {
    inputs: [
      ["Filing year", input.filingYear],
      ["EEE item", `${r.item.code} · ${itemLabel(r.item)}`],
      ["Sales started in", input.salesStartYear],
      [r.schedule === "III" ? `EEE placed on the market in ${r.targetYear}` : `Sales in ${r.targetYear}`, `${fmtKg(r.quantityKg)} kg`],
    ],
    results: [
      ["Schedule", scheduleLine(r, input.filingYear)],
      ["Years of sales operations", String(r.yearsOfSalesOperations)],
      ["EEE average life (years)", `${r.averageLife}${r.item.averageLifeStatus === "draft" ? " (draft)" : ""}`],
      [r.schedule === "III" ? "Target year" : "Base sales year", r.targetYear],
      ["Recycling target", `${fmtKg(r.targetKg)} kg`],
      ["Filing-year target", `${fmtKg(r.filingYearTargetKg)} kg`],
    ],
    metals: r.metals.map(m => [
      `${m.name} (${m.symbol})`,
      m.compositionPercent === null ? "–" : `${m.compositionPercent}%`,
      `${m.phaseInPercent}%`,
      m.kg === null ? "–" : `${fmtKg(m.kg)} kg`,
    ]),
    notes: r.notes,
  };
}

export function summaryText(s: Summary, data: Pick<EprData, "meta">, url?: string): string {
  const pad = (rows: [string, string][]) => rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  return [
    "E-waste EPR estimate (E-Waste (Management) Rules, 2022)",
    "",
    pad(s.inputs),
    "",
    pad(s.results),
    "",
    "Metal recovery obligation",
    ...s.metals.map(([m, c, p, q]) => `${m}: ${q} (composition ${c}, phase-in ${p})`),
    ...(s.notes.length ? ["", ...s.notes] : []),
    "",
    `Sources: ${data.meta.sources.filter(x => !x.key.startsWith("amendment") && x.key !== "portalFaq").map(x => `${x.issuer}, ${x.title} (${x.date})`).join("; ")}.`,
    DISCLAIMER,
    ...(url ? ["", url] : []),
  ].join("\n");
}

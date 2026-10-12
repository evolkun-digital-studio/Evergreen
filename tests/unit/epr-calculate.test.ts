import { describe, expect, it } from "vitest";
import { calculate, goldPhaseInPercent, quantityYearFor, type CalcInput } from "@/lib/epr/calculate";
import { eprData } from "@/lib/epr/data";
import { Dec, groupIndian } from "@/lib/epr/decimal";

const run = (input: CalcInput) => calculate(input, eprData);

function target(input: CalcInput) {
  const r = run(input);
  if (r.kind !== "target") throw new Error(`Expected a target result, got ${r.kind}: ${JSON.stringify(r)}`);
  return r;
}

const kg = (r: ReturnType<typeof target>, metal: "au" | "cu" | "fe" | "al") => {
  const row = r.metals.find(m => m.key === metal)!;
  return row.kg === null ? "–" : row.kg.toFixed(4);
};

describe("EPR calculator: reference case", () => {
  it("matches the reference calculator for air-conditioners (CEEW4), 2025-26, sales since 2005-06, 32 kg", () => {
    const ac = eprData.items.find(i => i.code === "CEEW4")!;
    expect(ac.name).toMatch(/^Air-Conditioners excluding centrali[sz]ed air conditioning plants$/i);
    const r = target({ filingYear: "2025-26", eeeId: ac.id, salesStartYear: "2005-06", quantityKg: "32.0000" });
    expect(r.yearsOfSalesOperations).toBe(21);
    expect(r.averageLife).toBe(10);
    expect(r.schedule).toBe("III");
    expect(r.targetYear).toBe("2015-16");
    expect(r.targetKg.toFixed(4)).toBe("22.4000");
    expect(r.filingYearTargetKg.toFixed(4)).toBe("0.0000");
    expect(kg(r, "au")).toBe("–");
    expect(kg(r, "cu")).toBe("1.6800");
    expect(kg(r, "fe")).toBe("10.0800");
    expect(kg(r, "al")).toBe("1.8816");
  });
});

describe("EPR calculator: Schedule III bands", () => {
  const base = { eeeId: "CEEW4", salesStartYear: "2000-01", quantityKg: "1000" };
  it.each([
    ["2023-24", 60, "600.0000", "2013-14"],
    ["2024-25", 60, "600.0000", "2014-15"],
    ["2025-26", 70, "700.0000", "2015-16"],
    ["2026-27", 70, "700.0000", "2016-17"],
    ["2027-28", 80, "800.0000", "2017-18"],
    ["2030-31", 80, "800.0000", "2020-21"],
  ])("%s → %i%% of sales in the target year", (filingYear, pct, expected, targetYear) => {
    const r = target({ ...base, filingYear });
    expect(r.schedule).toBe("III");
    expect(r.targetPercent).toBe(pct);
    expect(r.targetKg.toFixed(4)).toBe(expected);
    expect(r.targetYear).toBe(targetYear);
  });

  it("applies Schedule III when years of sales operations equal the average life (boundary)", () => {
    // CEEW4 average life 10; 2016-17 to 2025-26 inclusive is 10 years.
    const r = target({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2016-17", quantityKg: "50" });
    expect(r.yearsOfSalesOperations).toBe(10);
    expect(r.schedule).toBe("III");
    expect(r.targetYear).toBe("2015-16");
    expect(r.targetKg.toFixed(4)).toBe("35.0000");
    // The target year falls before sales started, which the result points out.
    expect(r.notes.some(n => n.includes("after the target year 2015-16"))).toBe(true);
  });

  it("uses Schedule IV one year below the boundary", () => {
    const r = target({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2017-18", quantityKg: "50" });
    expect(r.yearsOfSalesOperations).toBe(9);
    expect(r.schedule).toBe("IV");
  });
});

describe("EPR calculator: Schedule IV", () => {
  it("2025-26: 20% of sales two years back (2023-24)", () => {
    const r = target({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2020-21", quantityKg: "1000" });
    expect(r.schedule).toBe("IV");
    expect(r.targetYear).toBe("2023-24");
    expect(r.targetPercent).toBe(20);
    expect(r.filingYearTargetKg.toFixed(4)).toBe("200.0000");
    expect(r.targetKg.toFixed(4)).toBe("200.0000");
  });

  it("2023-24: 15% of sales in 2021-22", () => {
    const r = target({ filingYear: "2023-24", eeeId: "CEEW4", salesStartYear: "2019-20", quantityKg: "1234.5678" });
    expect(r.schedule).toBe("IV");
    expect(r.targetYear).toBe("2021-22");
    expect(r.targetPercent).toBe(15);
    // 1234.5678 × 0.15 = 185.18517 → 185.1852 (half-up)
    expect(r.targetKg.toFixed(4)).toBe("185.1852");
    expect(r.targetKg.toString()).toBe("185.18517");
  });

  it("2024-25: 20% of sales in 2022-23", () => {
    const r = target({ filingYear: "2024-25", eeeId: "CEEW4", salesStartYear: "2020-21", quantityKg: "10" });
    expect(r.targetYear).toBe("2022-23");
    expect(r.targetKg.toFixed(4)).toBe("2.0000");
  });

  it("tells the user the target is 0 when sales started after the base year", () => {
    const r = target({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2024-25", quantityKg: "0" });
    expect(r.schedule).toBe("IV");
    expect(r.notes.some(n => n.includes("after the base year 2023-24"))).toBe(true);
  });
});

describe("EPR calculator: key metals", () => {
  it("ITEW15 smart phones, 400,000 kg target in 2023-24, with 20% gold phase-in", () => {
    // Schedule IV 2023-24 is 15% of 2021-22 sales: 2,666,666.6667 kg → 400,000.000005 kg target.
    const r = target({ filingYear: "2023-24", eeeId: "ITEW15-smart-phones", salesStartYear: "2021-22", quantityKg: "2666666.6667" });
    expect(r.schedule).toBe("IV");
    expect(r.targetKg.toFixed(4)).toBe("400000.0000");
    expect(kg(r, "cu")).toBe("12000.0000");
    expect(kg(r, "fe")).toBe("12000.0000");
    expect(kg(r, "al")).toBe("31880.0000");
    const au = r.metals.find(m => m.key === "au")!;
    expect(au.phaseInPercent).toBe(20);
    // The brief's worked example used 0.0016% → 1.28 kg. Annexure I prints 0.00157% → 1.2560 kg.
    expect(au.compositionPercent).toBe("0.00157");
    expect(au.kg!.toFixed(4)).toBe("1.2560");
  });

  it("laptops (ITEW3) carry a gold obligation scaled by the phase-in", () => {
    const r = target({ filingYear: "2025-26", eeeId: "ITEW3", salesStartYear: "2010-11", quantityKg: "10000" });
    expect(r.schedule).toBe("III");
    expect(r.targetKg.toFixed(4)).toBe("7000.0000");
    // 7000 × 0.0004% × 45% = 0.0126 kg
    expect(kg(r, "au")).toBe("0.0126");
    expect(r.metals[0].phaseInPercent).toBe(45);
  });

  it("gold phase-in follows the notice and stays at 100% after 2028-29", () => {
    expect([2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => goldPhaseInPercent(eprData, y))).toEqual([20, 30, 45, 60, 80, 100, 100, 100]);
  });
});

describe("EPR calculator: edge cases", () => {
  it("0 kg gives zero targets and zero metals", () => {
    const r = target({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2005-06", quantityKg: "0" });
    expect(r.targetKg.toFixed(4)).toBe("0.0000");
    expect(kg(r, "cu")).toBe("0.0000");
  });

  it("very large quantities stay exact", () => {
    const r = target({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2005-06", quantityKg: "999999999999999.9999" });
    expect(r.targetKg.toFixed(4)).toBe("699999999999999.9999");
    expect(r.targetKg.toString()).toBe("699999999999999.99993");
    // Metals use the exact target (…99.99993), not the rounded one: × 8.4% = 58,799,999,999,999.99999412.
    expect(kg(r, "al")).toBe("58800000000000.0000");
  });

  it("rejects a sales start after the filing year", () => {
    const r = run({ filingYear: "2024-25", eeeId: "CEEW4", salesStartYear: "2025-26", quantityKg: "10" });
    expect(r).toEqual({ kind: "invalid", errors: { salesStartYear: "Sales start year can't be after the filing year." } });
  });

  it("rejects negative, non-numeric and over-precise quantities", () => {
    const base = { filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2005-06" };
    for (const q of ["-1", "abc", ""]) {
      expect(run({ ...base, quantityKg: q })).toEqual({ kind: "invalid", errors: { quantityKg: "Enter a quantity of 0 or more." } });
    }
    expect(run({ ...base, quantityKg: "1.23456" })).toEqual({ kind: "invalid", errors: { quantityKg: "Use up to 4 decimal places." } });
  });

  it("rejects unknown items and out-of-range filing years", () => {
    const r = run({ filingYear: "2019-20", eeeId: "NOPE1", salesStartYear: "2005-06", quantityKg: "1" });
    expect(r.kind).toBe("invalid");
    if (r.kind === "invalid") {
      expect(r.errors.filingYear).toMatch(/2023-24 to 2030-31/);
      expect(r.errors.eeeId).toBeDefined();
    }
  });

  it("solar PV (CEEW14) has no recycling target", () => {
    const r = run({ filingYear: "2025-26", eeeId: "CEEW14", salesStartYear: "2005-06", quantityKg: "100" });
    expect(r.kind).toBe("not-applicable");
  });

  it("quantityYearFor tells the user which year's quantity to enter", () => {
    expect(quantityYearFor({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2005-06" }, eprData)).toEqual({ schedule: "III", year: "2015-16" });
    expect(quantityYearFor({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2020-21" }, eprData)).toEqual({ schedule: "IV", year: "2023-24" });
  });
});

describe("EPR data integrity", () => {
  it("has all 106 Schedule I codes, each with a composition row", () => {
    const codes = new Set(eprData.items.map(i => i.code));
    expect(codes.size).toBe(106);
    for (const item of eprData.items) {
      expect(eprData.composition.some(c => c.code === item.code && c.variant === item.compositionVariant)).toBe(true);
      expect(item.averageLifeYears).toBeGreaterThan(0);
    }
  });
});

describe("Dec", () => {
  it("rounds half-up only when formatting", () => {
    expect(Dec.parse("0.00005").toFixed(4)).toBe("0.0001");
    expect(Dec.parse("0.00004999").toFixed(4)).toBe("0.0000");
    expect(Dec.parse("1.5").toFixed(0)).toBe("2");
    expect(Dec.parse("0.1").mul(Dec.parse("0.2")).toString()).toBe("0.02");
  });

  it("groups digits the Indian way", () => {
    expect(groupIndian("1234567.8900")).toBe("12,34,567.8900");
    expect(groupIndian("999.0000")).toBe("999.0000");
  });
});

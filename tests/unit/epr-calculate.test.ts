import { describe, expect, it } from "vitest";
import { calculate, explain, goldPhaseInPercent, plan, quantityFieldFor, type CalcInput, type Target } from "@/lib/epr/calculate";
import { eprData, regulatoryStatus, shortLabel } from "@/lib/epr/data";
import { Dec, groupIndian } from "@/lib/epr/decimal";
import { buildSummary, fmtKg, fmtMetalKg } from "@/lib/epr/summary";

const run = (input: CalcInput) => calculate(input, eprData);

function target(input: CalcInput): Target {
  const r = run(input);
  if (r.kind !== "target") throw new Error(`Expected a target result, got ${r.kind}: ${JSON.stringify(r)}`);
  return r;
}

const kg = (r: Target, metal: "au" | "cu" | "fe" | "al") => {
  const row = r.metals.find(m => m.key === metal)!;
  return row.kg === null ? "–" : row.kg.toFixed(4);
};

/** Every figure the summary (copy/PDF) shows must equal the result it came from. */
function expectConsistent(r: Target, input: CalcInput) {
  const s = buildSummary(input, r);
  const res = Object.fromEntries(s.results);
  expect(res["Estimated recycling target"]).toBe(`${fmtKg(r.targetKg)} kg`);
  expect(res["Reference sales year"]).toBe(r.referenceYear);
  expect(res["Applicable target percentage"]).toBe(`${r.targetPercent}%`);
  const last = explain(r, input, fmtKg).at(-1)!;
  expect(last).toBe(`Recycling target = ${fmtKg(r.quantityKg)} kg × ${r.targetPercent}% = ${fmtKg(r.targetKg)} kg.`);
}

describe("1. Sales started after the reference year", () => {
  it("the reported bug: filing 2026-27, sales from 2026-27, 1,000 kg typed → 0 kg everywhere", () => {
    const input = { filingYear: "2026-27", eeeId: "CEEW4", salesStartYear: "2026-27", quantityKg: "1000" };
    const r = target(input);
    expect(r.schedule).toBe("IV");
    expect(r.referenceYear).toBe("2024-25");
    expect(r.salesInReferenceYear).toBe(false);
    expect(r.quantityKg.isZero()).toBe(true);
    expect(r.targetKg.isZero()).toBe(true);
    expect(r.metals.every(m => m.kg === null || m.kg.isZero())).toBe(true);
    expect(r.notes[0]).toMatch(/^No sales recorded for 2024-25/);
    expectConsistent(r, input);
    expect(explain(r, input, fmtKg)).toContain("Sales started in 2026-27, after 2024-25. No sales recorded for that financial year, so the quantity is 0 kg.");
  });

  it("the brief's example: filing 2026-27, sales from 2025-26 → reference 2024-25, 0 kg", () => {
    const r = target({ filingYear: "2026-27", eeeId: "CEEW4", salesStartYear: "2025-26", quantityKg: "" });
    expect(r.referenceYear).toBe("2024-25");
    expect(r.targetKg.isZero()).toBe(true);
  });

  it("disables the quantity field instead of asking for it", () => {
    const f = quantityFieldFor(plan({ filingYear: "2026-27", eeeId: "CEEW4", salesStartYear: "2025-26", quantityKg: "" }, eprData));
    expect(f).toEqual({ year: "2024-25", label: "Sales in 2024-25 (kg)", disabled: true });
  });

  it("Schedule III at the boundary also gives 0 when Y − X precedes the first sales year", () => {
    // CEEW4 average life 10; 2016-17 to 2025-26 inclusive is 10 years, so Y − X = 2015-16, before sales began.
    const r = target({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2016-17", quantityKg: "50" });
    expect(r.yearsOfSalesOperations).toBe(10);
    expect(r.schedule).toBe("III");
    expect(r.referenceYear).toBe("2015-16");
    expect(r.targetKg.isZero()).toBe(true);
  });
});

describe("2. Sales started in the reference year", () => {
  it("Schedule IV: filing 2027-28, sales from 2025-26 → 20% of 2025-26 sales", () => {
    const input = { filingYear: "2027-28", eeeId: "CEEW4", salesStartYear: "2025-26", quantityKg: "1000" };
    const r = target(input);
    expect(r.schedule).toBe("IV");
    expect(r.referenceYear).toBe("2025-26");
    expect(r.salesInReferenceYear).toBe(true);
    expect(fmtKg(r.targetKg)).toBe("200");
    expectConsistent(r, input);
  });

  it("Schedule III: Y − X equal to the sales start year counts", () => {
    // ITEW3 laptops, average life 5. Sales from 2020-21, filing 2025-26: 6 years, Y − X = 2020-21.
    const r = target({ filingYear: "2025-26", eeeId: "ITEW3", salesStartYear: "2020-21", quantityKg: "100" });
    expect(r.schedule).toBe("III");
    expect(r.referenceYear).toBe("2020-21");
    expect(r.targetKg.toFixed(4)).toBe("70.0000");
  });
});

describe("3. Sales started before the reference year", () => {
  it("matches the reference calculator for air-conditioners (CEEW4), 2025-26, sales since 2005-06, 32 kg", () => {
    const ac = eprData.items.find(i => i.code === "CEEW4")!;
    expect(ac.name).toMatch(/^Air-Conditioners excluding centrali[sz]ed air conditioning plants$/i);
    const input = { filingYear: "2025-26", eeeId: ac.id, salesStartYear: "2005-06", quantityKg: "32.0000" };
    const r = target(input);
    expect(r.yearsOfSalesOperations).toBe(21);
    expect(r.averageLife).toBe(10);
    expect(r.schedule).toBe("III");
    expect(r.referenceYear).toBe("2015-16");
    expect(r.targetKg.toFixed(4)).toBe("22.4000");
    expect(kg(r, "au")).toBe("–");
    expect(kg(r, "cu")).toBe("1.6800");
    expect(kg(r, "fe")).toBe("10.0800");
    expect(kg(r, "al")).toBe("1.8816");
    expectConsistent(r, input);
  });

  it("Schedule IV 2025-26: 20% of sales two years back (2023-24)", () => {
    const r = target({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2020-21", quantityKg: "1000" });
    expect(r.schedule).toBe("IV");
    expect(r.referenceYear).toBe("2023-24");
    expect(r.targetPercent).toBe(20);
    expect(r.targetKg.toFixed(4)).toBe("200.0000");
  });

  it("Schedule IV 2023-24: 15% of 2021-22 sales; 2024-25: 20% of 2022-23 sales", () => {
    const a = target({ filingYear: "2023-24", eeeId: "CEEW4", salesStartYear: "2019-20", quantityKg: "1234.5678" });
    expect([a.referenceYear, a.targetPercent, a.targetKg.toString()]).toEqual(["2021-22", 15, "185.18517"]);
    const b = target({ filingYear: "2024-25", eeeId: "CEEW4", salesStartYear: "2020-21", quantityKg: "10" });
    expect([b.referenceYear, b.targetPercent, b.targetKg.toFixed(4)]).toEqual(["2022-23", 20, "2.0000"]);
  });
});

describe("4. Zero historical sales", () => {
  it("0 kg gives zero targets and zero metals", () => {
    const r = target({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2005-06", quantityKg: "0" });
    expect(r.targetKg.isZero()).toBe(true);
    expect(r.metals.every(m => m.kg === null || m.kg.isZero())).toBe(true);
    expect(fmtKg(r.targetKg)).toBe("0");
  });
});

describe("5. Filing-year changes", () => {
  const base = { eeeId: "CEEW4", salesStartYear: "2000-01", quantityKg: "1000" };
  it.each([
    ["2023-24", 60, "600", "2013-14"],
    ["2024-25", 60, "600", "2014-15"],
    ["2025-26", 70, "700", "2015-16"],
    ["2026-27", 70, "700", "2016-17"],
    ["2027-28", 80, "800", "2017-18"],
    ["2030-31", 80, "800", "2020-21"],
  ])("Schedule III %s → %i%% of the quantity in Y − X", (filingYear, pct, expected, ref) => {
    const r = target({ ...base, filingYear });
    expect(r.schedule).toBe("III");
    expect(r.targetPercent).toBe(pct);
    expect(fmtKg(r.targetKg)).toBe(expected);
    expect(r.referenceYear).toBe(ref);
  });

  it("never applies a quantity entered for another year", () => {
    // 1,000 kg was typed for 2023-24 (filing 2025-26). After switching to filing 2026-27 the reference is 2024-25.
    const r = run({ filingYear: "2026-27", eeeId: "CEEW4", salesStartYear: "2020-21", quantityKg: "1000", quantityYear: "2023-24" });
    expect(r).toEqual({ kind: "invalid", errors: { quantityKg: "Enter the quantity for 2024-25." } });
  });

  it("flags the review of targets after 2028-29", () => {
    expect(target({ ...base, filingYear: "2029-30" }).notes.some(n => n.includes("reviewed after 2028-29"))).toBe(true);
  });
});

describe("6. EEE category changes", () => {
  it("the same inputs give a different reference year for items with different average lives", () => {
    const common = { filingYear: "2025-26", salesStartYear: "2000-01", quantityKg: "100" };
    const mainframes = target({ ...common, eeeId: "ITEW1-mainframes" });
    const minis = target({ ...common, eeeId: "ITEW1-minicomputers" });
    expect([mainframes.item.code, minis.item.code]).toEqual(["ITEW1", "ITEW1"]);
    expect([mainframes.averageLife, minis.averageLife]).toEqual([10, 5]);
    expect([mainframes.referenceYear, minis.referenceYear]).toEqual(["2015-16", "2020-21"]);
  });

  it("keeps repeated codes but gives every sub-type a unique id", () => {
    const ids = eprData.items.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(eprData.items.filter(i => i.code === "ITEW1").length).toBe(2);
  });

  it("short labels read like the official list", () => {
    const by = (id: string) => shortLabel(eprData.items.find(i => i.id === id)!);
    expect(by("ITEW1-mainframes")).toBe("Mainframes");
    expect(by("ITEW1-minicomputers")).toBe("Minicomputers");
    expect(by("ITEW3")).toBe("Laptop Computers");
  });
});

describe("7. Schedule IV to Schedule III transition", () => {
  it("one year below the average life is Schedule IV, at the average life it is Schedule III", () => {
    const iv = target({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2017-18", quantityKg: "50" });
    expect([iv.yearsOfSalesOperations, iv.schedule]).toEqual([9, "IV"]);
    const iii = target({ filingYear: "2026-27", eeeId: "CEEW4", salesStartYear: "2017-18", quantityKg: "50" });
    expect([iii.yearsOfSalesOperations, iii.schedule, iii.referenceYear]).toEqual([10, "III", "2016-17"]);
  });
});

describe("8. Different average lives", () => {
  it("uses Y − X with each item's own X, not a fixed two years", () => {
    for (const item of eprData.items.filter(i => i.targetsApply)) {
      const r = target({ filingYear: "2028-29", eeeId: item.id, salesStartYear: "1990-91", quantityKg: "1" });
      expect(r.schedule).toBe("III");
      expect(r.referenceYear).toBe(`${2028 - item.averageLifeYears}-${String((2029 - item.averageLifeYears) % 100).padStart(2, "0")}`);
    }
  });

  it("marks draft average lives", () => {
    const draft = eprData.items.find(i => i.averageLifeStatus === "draft" && i.targetsApply)!;
    const r = target({ filingYear: "2025-26", eeeId: draft.id, salesStartYear: "2000-01", quantityKg: "1" });
    expect(r.notes.some(n => n.includes("draft list of 21 March 2023"))).toBe(true);
  });
});

describe("9. Decimal and large-quantity inputs", () => {
  it("very large quantities stay exact", () => {
    const r = target({ filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2005-06", quantityKg: "999999999999999.9999" });
    expect(r.targetKg.toString()).toBe("699999999999999.99993");
    expect(fmtKg(r.targetKg)).toBe("69,99,99,99,99,99,999.9999");
    // Metals use the exact target, not the rounded one.
    expect(kg(r, "al")).toBe("58800000000000.0000");
  });

  it("accepts up to 4 decimals and rejects bad input with clear messages", () => {
    const base = { filingYear: "2025-26", eeeId: "CEEW4", salesStartYear: "2005-06" };
    expect(target({ ...base, quantityKg: "0.0001" }).targetKg.toString()).toBe("0.00007");
    expect(target({ ...base, quantityKg: ".5" }).quantityKg.toString()).toBe("0.5");
    const err = (q: string) => (run({ ...base, quantityKg: q }) as { errors: Record<string, string> }).errors.quantityKg;
    expect(err("-1")).toBe("Quantity can't be negative.");
    expect(err("abc")).toBe("Enter a number, such as 1250 or 1250.5.");
    expect(err("")).toBe("Enter a quantity of 0 or more.");
    expect(err("1.23456")).toBe("Use up to 4 decimal places.");
    expect(err("1234567890123456")).toBe("That quantity is too large.");
  });

  it("shows up to 4 decimals only where needed", () => {
    expect(fmtKg(Dec.parse("700"))).toBe("700");
    expect(fmtKg(Dec.parse("185.18517"))).toBe("185.1852");
    expect(fmtKg(Dec.parse("1234567.5"))).toBe("12,34,567.5");
  });

  it("rejects sales starting after the filing year, unknown items and out-of-range years", () => {
    expect(run({ filingYear: "2024-25", eeeId: "CEEW4", salesStartYear: "2025-26", quantityKg: "10" })).toEqual({
      kind: "invalid",
      errors: { salesStartYear: "Sales start year can't be after the filing year." },
    });
    const r = run({ filingYear: "2019-20", eeeId: "NOPE1", salesStartYear: "2005-06", quantityKg: "1" });
    expect(r.kind === "invalid" && r.errors.filingYear).toMatch(/2023-24 to 2030-31/);
    expect(r.kind === "invalid" && r.errors.eeeId).toBeTruthy();
  });
});

describe("10. Metal recovery precision", () => {
  it("ITEW15 smart phones, 400,000 kg target in 2023-24, with 20% gold phase-in", () => {
    // Schedule IV 2023-24 is 15% of 2021-22 sales: 2,666,666.6667 kg → 400,000.000005 kg target.
    const r = target({ filingYear: "2023-24", eeeId: "ITEW15-smart-phones", salesStartYear: "2021-22", quantityKg: "2666666.6667" });
    expect(r.targetKg.toFixed(4)).toBe("400000.0000");
    expect(kg(r, "cu")).toBe("12000.0000");
    expect(kg(r, "fe")).toBe("12000.0000");
    expect(kg(r, "al")).toBe("31880.0000");
    const au = r.metals.find(m => m.key === "au")!;
    expect(au.phaseInPercent).toBe(20);
    // Annexure I prints 0.00157% → 1.2560 kg.
    expect(au.compositionPercent).toBe("0.00157");
    expect(au.kg!.toFixed(4)).toBe("1.2560");
  });

  it("laptops (ITEW3) carry a gold obligation scaled by the phase-in", () => {
    const r = target({ filingYear: "2025-26", eeeId: "ITEW3", salesStartYear: "2010-11", quantityKg: "10000" });
    // 7000 × 0.0004% × 45% = 0.0126 kg
    expect(kg(r, "au")).toBe("0.0126");
  });

  it("does not round small gold quantities away", () => {
    // 10 kg laptops → 7 kg target × 0.0004% × 45% = 0.0000126 kg, which is 0.0000 at 4 decimals.
    const r = target({ filingYear: "2025-26", eeeId: "ITEW3", salesStartYear: "2010-11", quantityKg: "10" });
    const au = r.metals.find(m => m.key === "au")!.kg!;
    expect(au.toString()).toBe("0.0000126");
    expect(fmtMetalKg(au)).toBe("0.0000126");
    expect(fmtMetalKg(Dec.parse("0.005"))).toBe("0.005");
    expect(fmtMetalKg(Dec.parse("12.34567"))).toBe("12.3457");
  });

  it("gold phase-in follows the CPCB notice and stays at 100% after 2028-29", () => {
    expect([2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => goldPhaseInPercent(eprData, y))).toEqual([20, 30, 45, 60, 80, 100, 100, 100]);
  });
});

describe("12. Regulatory exceptions and importer rules", () => {
  it("importers of used EEE: 100% of the quantity reaching end of life in the filing year", () => {
    const input: CalcInput = { filingYear: "2026-27", eeeId: "ITEW3", salesStartYear: "", quantityKg: "250.5", producerType: "used-importer" };
    const r = target(input);
    expect(r.schedule).toBe("used-import");
    expect(r.targetPercent).toBe(100);
    expect(r.referenceYear).toBe("2026-27");
    expect(r.yearsOfSalesOperations).toBeNull();
    expect(fmtKg(r.targetKg)).toBe("250.5");
    expect(r.notes.some(n => n.includes("Schedule III note 2"))).toBe(true);
    expectConsistent(r, input);
  });

  it("solar PV (CEEW14) has no recycling target", () => {
    const r = run({ filingYear: "2025-26", eeeId: "CEEW14", salesStartYear: "2005-06", quantityKg: "100" });
    expect(r.kind).toBe("not-applicable");
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

  it("records every amendment to the 2022 rules with its effective date", () => {
    const gsr = eprData.meta.sources.map(s => /G\.S\.R\. (\d+)\(E\)/.exec(s.title)?.[1]).filter(Boolean);
    expect(gsr).toEqual(expect.arrayContaining(["801", "61", "534", "164", "699"]));
    for (const s of eprData.meta.sources.filter(x => x.key === "rules" || x.key.startsWith("amendment"))) expect(s.effective).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(regulatoryStatus.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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

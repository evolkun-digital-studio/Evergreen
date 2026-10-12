/**
 * Builds src/data/epr/*.json from the official PDFs in reference/epr/.
 * Usage: pnpm epr:data   (add --check to compare with the committed JSON without writing)
 *
 * Every number in the output is read from a PDF. The script knows the table layouts
 * (column positions, which codes have sub-types) but never supplies a value itself.
 * Text is read with pdfjs-dist, so no system PDF tools are needed.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const ROOT = process.cwd();
const REF = path.join(ROOT, "reference/epr");
const OUT = path.join(ROOT, "src/data/epr");
const CHECK_ONLY = process.argv.includes("--check");

const SOURCES = {
  rules: {
    file: "ewaste-rules-2022-gsr801e-2022-11-02.pdf",
    title: "E-Waste (Management) Rules, 2022 (G.S.R. 801(E))",
    issuer: "Ministry of Environment, Forest and Climate Change",
    date: "2022-11-02",
    url: "https://cpcb.gov.in/uploads/Projects/E-Waste/e-waste_rules_2022.pdf",
    usedFor: "Schedule I (EEE items and codes), Schedule III and Schedule IV targets",
  },
  amendment2023: {
    file: "ewaste-rules-2022-amendment-2023-01.pdf",
    title: "E-Waste (Management) Amendment Rules, 2023 (G.S.R. 61(E))",
    issuer: "Ministry of Environment, Forest and Climate Change",
    date: "2023-01-30",
    url: "https://tnpcb.gov.in/owems/pdf/regulations/Ewaste%20Rules2022_Amendment%20Jan23.pdf",
    usedFor: "Checked: amends rule 16 and Schedule II only; Schedules I, III and IV unchanged",
  },
  amendment2024: {
    file: "egazette-2024-252788.pdf",
    title: "E-Waste (Management) Amendment Rules, 2024 (G.S.R. 164(E))",
    issuer: "Ministry of Environment, Forest and Climate Change",
    date: "2024-03-08",
    url: "https://egazette.gov.in/writeReadData/2024/252788.pdf",
    usedFor: "Checked: amends rules 3, 9 and 15 (definitions, relaxation, EPR certificate prices); Schedules I, III and IV unchanged",
  },
  metals: {
    file: "cpcb-key-metals-notice-2023-09-21.pdf",
    title: "Framework for generation of EPR Certificate under E-Waste (Management) Rules, 2022, with Annexure I",
    issuer: "Central Pollution Control Board",
    date: "2023-09-21",
    url: "https://cpcb.gov.in/openpdffile.php?id=TGF0ZXN0RmlsZS8zOTBfMTY5NTM1ODM1OF9tZWRpYXBob3RvMjA2MzgucGRm",
    usedFor: "Key-metal composition per EEE item (Annexure I) and the gold phase-in (paragraph 6)",
  },
  lifeDraft: {
    file: "cpcb-average-life-draft.pdf",
    title: "Draft average life proposed for the notified EEE items under the E-Waste (Management) Rules, 2022",
    issuer: "Central Pollution Control Board",
    date: "2023-03-21",
    url: "https://cpcb.nic.in/openpdffile.php?id=UmVwb3J0RmlsZXMvMTUwOV8xNjc5Mzc0NjE5X21lZGlhcGhvdG8xMDQ1Mi5wZGY%3D",
    usedFor: "Average life of the 85 EEE items added in 2022 (DRAFT: no final list found)",
  },
  life2016: {
    file: "cpcb-guidelines-ewaste-rules-2016.pdf",
    title: "Guidelines on Implementation of E-Waste (Management) Rules, 2016, section 2.1.1",
    issuer: "Central Pollution Control Board",
    date: "2016",
    url: "https://cpcb.nic.in/displaypdf.php?id=aHdtZC9HVUlERUxJTkVTX0VXQVNURV9SVUxFU18yMDE2LnBkZg%3D%3D",
    usedFor: "Average life of the 21 original EEE items (ITEW1–ITEW16, CEEW1–CEEW5)",
  },
  faq: {
    file: "cpcb-faq-ewaste-2024-01-23.pdf",
    title: "FAQs under E-Waste (Management) Rules, 2022",
    issuer: "Central Pollution Control Board",
    date: "2024-01-23",
    url: "https://cpcb.nic.in/uploads/Projects/E-Waste/FAQ_ewaste_23012024.pdf",
    usedFor: "Confirms Schedule III/IV targets, the 100% target for imported used EEE and the 20% first-year gold obligation",
  },
  portalFaq: {
    file: "cpcb-epr-portal-faq.pdf",
    title: "E-Waste EPR portal FAQ",
    issuer: "Central Pollution Control Board",
    date: "2024-01-23",
    url: "https://eprewaste.cpcb.gov.in/assets/PDF/faqewaste.pdf",
    usedFor: "Same target wording as the CPCB FAQ (cross-check)",
  },
} as const;
type SourceKey = keyof typeof SOURCES;

// ---------- PDF text with coordinates ----------

type Tok = { s: string; x: number; cx: number; y: number; page: number };
type Line = { page: number; y: number; toks: Tok[]; text: string };

const docCache = new Map<SourceKey, Tok[][]>();

async function pages(key: SourceKey): Promise<Tok[][]> {
  const hit = docCache.get(key);
  if (hit) return hit;
  const data = new Uint8Array(readFileSync(path.join(REF, SOURCES[key].file)));
  const doc = await getDocument({ data, verbosity: 0 }).promise;
  const out: Tok[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    const toks: Tok[] = [];
    for (const it of tc.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      const x = it.transform[4];
      toks.push({ s: it.str.trim(), x, cx: x + it.width / 2, y: it.transform[5], page: n });
    }
    out.push(toks);
  }
  docCache.set(key, out);
  return out;
}

/** Groups tokens into lines (same baseline within `tol`), top to bottom, left to right. */
function lines(toks: Tok[], tol = 2.5): Line[] {
  const sorted = [...toks].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const out: Line[] = [];
  for (const t of sorted) {
    const last = out.at(-1);
    if (last && last.page === t.page && Math.abs(last.y - t.y) <= tol) last.toks.push(t);
    else out.push({ page: t.page, y: t.y, toks: [t], text: "" });
  }
  for (const l of out) {
    l.toks.sort((a, b) => a.x - b.x);
    l.text = l.toks.map(t => t.s).join(" ").replace(/\s+/g, " ").trim();
  }
  return out;
}

const pageText = (toks: Tok[]) => lines(toks).map(l => l.text).join("\n");

class ExtractionError extends Error {}
const missing: string[] = [];
function need<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new ExtractionError(`Missing: ${what}`);
  return value;
}

const CODE_RE = /^(ITEW|CEEW|LSEEW|EETW|TLSEW|MDW|LIW)(\d+)\b/;
const tidy = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/([A-Za-z])- ([A-Za-z])/g, "$1-$2") // "Air- Conditioners" → "Air-Conditioners" (PDF spacing)
    .replace(/\s+([,.)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .trim();

// ---------- 1. Schedule I (Rules 2022) ----------

type ScheduleItem = { code: string; category: string; name: string };

async function scheduleI(): Promise<ScheduleItem[]> {
  const all = (await pages("rules")).flat();
  const ls = lines(all);
  const start = ls.findIndex(l => /^SCHEDULE\s*-\s*I$/.test(l.text));
  const end = ls.findIndex((l, i) => i > start && /^SCHEDULE\s*-\s*II$/.test(l.text));
  if (start < 0 || end < 0) throw new ExtractionError("Schedule I boundaries not found in the Rules PDF");

  const items: ScheduleItem[] = [];
  let category = "";
  let last: "item" | "category" | null = null;
  let prev: Line | null = null;
  for (const l of ls.slice(start + 1, end)) {
    // Skip running page headers/footers and the table header.
    if (l.y > 780 || /GAZETTE OF INDIA/.test(l.text) || /^\[See rules/.test(l.text)) continue;
    if (/^(Sl\.|No\.|Categories of electrical|and spares covered)/.test(l.text) || /equipment code$|^electronic$/.test(l.text)) {
      last = null;
      continue;
    }
    const roman = l.toks[0].s.match(/^\((i|ii|iii|iv|v|vi|vii)\)$/);
    const codeTok = l.toks.find(t => t.x > 400 && CODE_RE.test(t.s));
    const nameText = l.toks.filter(t => t !== codeTok && t !== (roman ? l.toks[0] : undefined)).map(t => t.s).join(" ");
    const sameBlock = prev && prev.page === l.page && prev.y - l.y < 14;
    if (roman) {
      category = nameText;
      last = "category";
    } else if (codeTok) {
      items.push({ code: codeTok.s.match(CODE_RE)![0], category, name: nameText });
      last = "item";
    } else if (last === "item" && sameBlock) {
      items[items.length - 1].name += ` ${nameText}`;
    } else if (last === "category" && sameBlock) {
      category += ` ${nameText}`;
    }
    prev = l;
  }
  return items.map(i => ({
    code: i.code,
    category: tidy(i.category).replace(/:$/, "").trim(),
    name: tidy(i.name),
  }));
}

// ---------- 2. Schedules III and IV (Rules 2022) ----------

type Targets = {
  scheduleIII: { fromYear: string; toYear: string | null; percent: number }[];
  scheduleIV: { filingYear: string; toYear: string | null; percent: number; baseYear: string | null; baseRule: string }[];
  importedUsedEeePercent: number;
  notApplicableCodes: string[];
};

const fy = (start: number) => `${start}-${String((start + 1) % 100).padStart(2, "0")}`;

async function targets(): Promise<Targets> {
  const text = (await pages("rules")).map(pageText).join("\n");
  const iii = text.slice(text.indexOf("SCHEDULE - III"), text.indexOf("SCHEDULE - IV"));
  // The table prints the years in one column and the six target rows after it.
  const table = iii.slice(0, iii.indexOf("Note:")); // the note below mentions 2028-2029 again
  const years = [...table.matchAll(/(20\d\d)\s*-\s*(20\d\d)( onwards)?/g)].map(m => ({ start: Number(m[1]), onwards: !!m[3] }));
  const pcts = [...table.matchAll(/(\d{1,3})% of the quantity of an EEE placed in the market in year Y-X/g)].map(m => Number(m[1]));
  if (years.length !== 6 || pcts.length !== 6) throw new ExtractionError(`Schedule III: found ${years.length} years and ${pcts.length} targets, expected 6 each`);
  const scheduleIII: Targets["scheduleIII"] = [];
  years.forEach((y, i) => {
    const prevRow = scheduleIII.at(-1);
    if (prevRow && prevRow.percent === pcts[i] && !y.onwards) prevRow.toYear = fy(y.start);
    else if (prevRow && prevRow.percent === pcts[i] && y.onwards) prevRow.toYear = null;
    else scheduleIII.push({ fromYear: fy(y.start), toYear: y.onwards ? null : fy(y.start), percent: pcts[i] });
  });

  const ivStart = text.indexOf("SCHEDULE - IV");
  const iv = text.slice(ivStart, text.indexOf("SCHEDULE - V", ivStart + 10));
  const rows = [...iv.matchAll(/(20\d\d)\s*-\s*(20\d\d)( onwards)?\s+(\d{1,3})% of the sales figure of (?:the )?financial year (20\d\d-\d\d|two years back)/g)];
  if (rows.length !== 3) throw new ExtractionError(`Schedule IV: found ${rows.length} rows, expected 3`);
  const scheduleIV = rows.map(m => ({
    filingYear: fy(Number(m[1])),
    toYear: m[3] ? null : fy(Number(m[1])),
    percent: Number(m[4]),
    baseYear: m[5] === "two years back" ? null : m[5],
    baseRule: m[5] === "two years back" ? "financial year two years before the filing year" : `financial year ${m[5]}`,
  }));

  const imported = text.match(/importers of used electrical and electronic equipment shall have (\d{1,3})% extended/);
  const solar = /recycling targets shall not be applicable for waste generated from solar photo-\s*voltaic/i.test(text.replace(/\n/g, " "));
  return {
    scheduleIII,
    scheduleIV,
    importedUsedEeePercent: Number(need(imported?.[1], "Schedule III note on imported used EEE")),
    // Schedule III note (3) and Schedule IV note (2): no recycling target for solar PV waste.
    notApplicableCodes: solar ? ["CEEW14"] : [],
  };
}

// ---------- 3. Annexure I: key-metal composition ----------

type Composition = { code: string; variant: "F.P" | "S.P" | null; au: string | null; cu: string | null; fe: string | null; al: string | null };
const NUM_RE = /^\d+(\.\d+)?$/;

async function composition(): Promise<Composition[]> {
  const pgs = await pages("metals");
  const rows: Composition[] = [];
  for (const toks of pgs) {
    const header = ["Au", "Cu", "Fe", "Al"].map(h => toks.find(t => t.s === h && t.y > 600));
    if (header.some(h => !h)) continue; // not an Annexure page
    const cols = header.map(h => h!.cx);
    const minX = cols[0] - 35;
    for (const code of toks.filter(t => CODE_RE.test(t.s) && t.x > 180 && t.x < 270)) {
      const v = code.s.match(/\((F|S)\.\s*$/)?.[1];
      const variant = v ? (v === "F" ? "F.P" : "S.P") : null;
      // "ITEW15, (F." wraps onto a second line ("P)"); the values sit midway between the two.
      const wrap = variant ? toks.find(t => t.s === "P)" && code.y - t.y > 0 && code.y - t.y < 20 && Math.abs(t.x - code.x) < 40) : undefined;
      const rowY = wrap ? (code.y + wrap.y) / 2 : code.y;
      const cells: (string | null)[] = [null, null, null, null];
      const seen = [false, false, false, false];
      for (const t of toks) {
        if (t.cx < minX || Math.abs(t.y - rowY) > 3.5) continue;
        if (t.s !== "-" && !NUM_RE.test(t.s)) continue;
        const col = cols.reduce((best, c, i) => (Math.abs(t.cx - c) < Math.abs(t.cx - cols[best]) ? i : best), 0);
        if (seen[col]) throw new ExtractionError(`Annexure I: two values in one column for ${code.s} (page ${t.page})`);
        seen[col] = true;
        cells[col] = t.s === "-" ? null : t.s;
      }
      // A cell may be printed as "-" or left blank; both mean no recoverable amount.
      if (!seen.some(Boolean)) throw new ExtractionError(`Annexure I: no values found for ${code.s} (page ${code.page})`);
      const [au, cu, fe, al] = cells;
      rows.push({ code: code.s.match(CODE_RE)![0], variant, au, cu, fe, al });
    }
  }
  // Routers, LAN switches and access points are listed separately under ITEW22 with identical
  // values; keep one row once they are confirmed equal.
  const out: Composition[] = [];
  for (const r of rows) {
    const twin = out.find(o => o.code === r.code && o.variant === r.variant);
    if (!twin) out.push(r);
    else if (JSON.stringify(twin) !== JSON.stringify(r)) throw new ExtractionError(`Annexure I: ${r.code} has conflicting rows`);
  }
  return out;
}

// ---------- 4. Gold phase-in (notice, paragraph 6) ----------

async function goldPhaseIn(): Promise<{ filingYear: string; percent: number }[]> {
  const text = (await pages("metals")).map(pageText).join(" ").replace(/\s+/g, " ");
  const para = need(text.match(/EPR obligation for gold may be (\d+)% of total gold obligation in the first year of implementation that is in FY (\d\d)-(\d\d).*?\(i\.e\. ([^)]*?) for the year (20\d\d)-(\d\d)\)/), "gold phase-in paragraph");
  const first = Number(para[1]);
  const firstYear = 2000 + Number(para[2]);
  const later = [...para[4].matchAll(/(\d+)%?/g)].map(m => Number(m[1]));
  const lastYear = Number(para[5]);
  const values = [first, ...later];
  if (firstYear + values.length - 1 !== lastYear) {
    throw new ExtractionError(`Gold phase-in: ${values.length} values from ${fy(firstYear)} do not end at ${fy(lastYear)}`);
  }
  return values.map((percent, i) => ({ filingYear: fy(firstYear + i), percent }));
}

// ---------- 5. Average life ----------

type LifeVariant = { label: string; years: number };
type Life = { code: string; source: "life2016" | "lifeDraft"; years: number | null; variants: LifeVariant[] };

/**
 * Codes whose average life is split into sub-types. Each label is a pattern that must be found
 * in the PDF; the number is read from the same row. `name` is the label shown on the site.
 */
const LIFE_VARIANTS: Record<string, { source: Life["source"]; variants: { name: string; match: RegExp; until?: RegExp }[] }> = {
  ITEW1: { source: "life2016", variants: [{ name: "Mainframes", match: /^Mainframe$/ }, { name: "Minicomputers", match: /^Minicomputer$/ }] },
  ITEW15: { source: "life2016", variants: [{ name: "Feature phones", match: /^Feature phones$/ }, { name: "Smart phones", match: /^Smart phones$/ }] },
  ITEW17: {
    source: "lifeDraft",
    variants: [
      { name: "Bluetooth enabled devices", match: /Bluetooth enabled devices/ },
      { name: "Telecommunication antennas", match: /Telecommunication$/ },
      { name: "Transmitters", match: /Transmitters/ },
      { name: "Walkie-talkies", match: /Walkie talkie/ },
      { name: "Wi-Fi/wireless enabled devices", match: /Wi-Fi\/wireless enabled/ },
      { name: "Radio/satellite telephones", match: /Radio\/Satellite Telephone/ },
    ],
  },
  ITEW24: { source: "lifeDraft", variants: [{ name: "Up to 2 kVA", match: /up to 2 KVA/ }, { name: "Above 2 kVA", match: />\s*2\s*KVA/ }] },
  ITEW25: { source: "lifeDraft", variants: [{ name: "Up to 2 kVA", match: /up to 2 KVA/ }, { name: "Above 2 kVA", match: />\s*2\s*KVA/ }] },
  ITEW27: {
    source: "lifeDraft",
    variants: [
      { name: "Flash drives (small devices)", match: /flash drives/ },
      { name: "Large devices such as servers", match: /large devices like Servers/ },
    ],
  },
  CEEW13: {
    source: "lifeDraft",
    variants: [
      { name: "CCTV cameras with DVR and NVR", match: /^CCTV Camera$/ },
      { name: "Digital sound and video recorders and players", match: /^Digital sound and$/ },
      { name: "Other products", match: /^Others products or$/ },
    ],
  },
  CEEW18: {
    source: "lifeDraft",
    variants: [
      { name: "LEDs used by consumers", match: /LED used by Consumers/ },
      { name: "LEDs used for professional purposes", match: /LED used for Professional purpose/ },
    ],
  },
  MDW4: {
    source: "lifeDraft",
    variants: [
      { name: "Diagnostic cardiology", match: /^Diagnostic Cardiology$/ },
      { name: "Anaesthesia and respiratory", match: /^Anaesthesia & Respiratory$/ },
    ],
  },
  MDW8: {
    source: "lifeDraft",
    variants: [
      { name: "MRI", match: /^MRI$/ },
      { name: "PET-CT / PET", match: /^PET\s+CT\/PET$/ },
      { name: "SPECT-CT / SPECT", match: /^SPECT\s+CT\/\s*SPECT$/ },
      { name: "CT", match: /^CT$/ },
      { name: "Ultrasound", match: /^US$/ },
    ],
  },
  MDW10: {
    source: "lifeDraft",
    variants: [
      { name: "Maternal and infant care products", match: /^Maternal & Infant care$/ },
      { name: "C-arm", match: /^C-Arm$/ },
      { name: "Monitoring solutions (high end)", match: /^Monitoring Solution$/ },
      { name: "X-ray and fluoroscopy", match: /^X-ray and fluoroscopy$/ },
      { name: "Mammography devices", match: /^Mammography devices$/ },
      // A 16-line label; its value is centred on the whole block.
      { name: "Other devices in this category", match: /^Other electric$/, until: /^and their accessories$/ },
    ],
  },
};

/** "10 Years", "10", "5 - up to 2 KVA" → leading integer. */
const lifeNumber = (s: string) => s.match(/^(\d{1,2})(?:\s*Years?)?(?:\s*-.*)?$/)?.[1];

async function averageLife(codes: string[]): Promise<Life[]> {
  const out: Life[] = [];
  const bySource = { life2016: await pages("life2016"), lifeDraft: await pages("lifeDraft") };
  // The 2016 guidelines misprint CEEW3 and CEEW4 as "CCEW3" and "CCEW4".
  const codeOf = (s: string) => s.replace(/^CCEW(\d)$/, "CEEW$1").match(CODE_RE)?.[0];

  for (const source of ["life2016", "lifeDraft"] as const) {
    const pgs = bySource[source];
    const tableToks = source === "life2016" ? pgs.slice(4, 6).flat() : pgs.flat();
    const codeToks = tableToks.filter(t => t.x > 280 && t.x < 470 && codeOf(t.s));
    for (const ct of codeToks) {
      const code = codeOf(ct.s)!;
      if (out.some(o => o.code === code)) continue;
      const spec = LIFE_VARIANTS[code];
      if (spec) {
        if (spec.source !== source) continue;
        const pageToks = tableToks.filter(t => t.page === ct.page);
        const isValue = (t: Tok) => /^\d{1,2}(\s*Years?)?$/.test(t.s);
        // Labels can span several tokens ("Others" + "products or"), so match whole lines of text.
        // Draft sub-types sit in a column right of the code; 2016 ones are rows in the name column.
        const labelLines = lines(pageToks.filter(t => !isValue(t) && (source === "lifeDraft" ? t.x > 340 : true)));
        const variants = spec.variants.map(v => {
          const label = need(
            labelLines.find(l => v.match.test(l.text)),
            `${code} average-life sub-type "${v.name}" in ${SOURCES[source].file}`,
          );
          // The number is either in the label itself ("5 - up to 2 KVA") or in the value column,
          // vertically centred in the sub-row, so up to ~16pt below the label's first line.
          const inline = lifeNumber(label.text);
          const last = v.until ? need(labelLines.find(l => l.y < label.y && v.until!.test(l.text)), `${code} "${v.name}" label end`) : label;
          const mid = (label.y + last.y) / 2;
          const valueTok = inline
            ? undefined
            : pageToks
                .filter(t => isValue(t) && t.x > label.toks[0].x + 60 && t.y >= last.y - 16 && t.y <= label.y + 8)
                .sort((a, b) => Math.abs(a.y - mid) - Math.abs(b.y - mid))[0];
          const years = Number(need(inline ?? (valueTok && lifeNumber(valueTok.s)), `${code} "${v.name}" average life value`));
          return { label: v.name, years };
        });
        out.push({ code, source, years: null, variants });
        continue;
      }
      const near = (tol: number) =>
        tableToks
          .filter(t => t.page === ct.page && t.x > ct.x + 20 && Math.abs(t.y - ct.y) < tol && lifeNumber(t.s))
          .sort((a, b) => Math.abs(a.y - ct.y) - Math.abs(b.y - ct.y) || a.x - b.x)[0];
      // Usually on the code's baseline; LIW1's code is printed ~7pt above its value. Accept the
      // looser match only if no other code row is closer to that value.
      let valueTok: Tok | undefined = near(3.5);
      if (!valueTok) {
        const loose = near(9);
        const closer = loose && codeToks.some(o => o !== ct && o.page === ct.page && Math.abs(o.y - loose.y) < Math.abs(ct.y - loose.y));
        valueTok = closer ? undefined : loose;
      }
      out.push({ code, source, years: Number(need(valueTok && lifeNumber(valueTok.s), `${code} average life in ${SOURCES[source].file}`)), variants: [] });
    }
  }
  // Collapse sub-types that all share one value (CEEW13: 7, 7, 7).
  for (const l of out) {
    if (l.variants.length && l.variants.every(v => v.years === l.variants[0].years)) {
      l.years = l.variants[0].years;
      l.variants = [];
    }
  }
  for (const c of codes) if (!out.some(o => o.code === c)) missing.push(`Average life for ${c}`);
  return out;
}

// ---------- Assemble, validate, cross-check ----------

const pct = z.string().regex(/^\d+(\.\d+)?$/).refine(s => Number(s) >= 0 && Number(s) <= 100, "0–100");
const fyRe = /^20\d\d-\d\d$/;

const itemSchema = z.object({
  id: z.string().regex(/^[A-Z]+\d+(-[a-z0-9-]+)?$/),
  code: z.string().regex(CODE_RE),
  category: z.string().min(3),
  name: z.string().min(2),
  variant: z.string().nullable(),
  averageLifeYears: z.number().int().positive(),
  averageLifeStatus: z.enum(["final", "draft"]),
  averageLifeSource: z.enum(["life2016", "lifeDraft"]),
  compositionVariant: z.enum(["F.P", "S.P"]).nullable(),
  targetsApply: z.boolean(),
});
const compositionSchema = z.object({
  code: z.string().regex(CODE_RE),
  variant: z.enum(["F.P", "S.P"]).nullable(),
  au: pct.nullable(),
  cu: pct.nullable(),
  fe: pct.nullable(),
  al: pct.nullable(),
});
const targetsSchema = z.object({
  scheduleIII: z.array(z.object({ fromYear: z.string().regex(fyRe), toYear: z.string().regex(fyRe).nullable(), percent: z.number().min(0).max(100) })).min(1),
  scheduleIV: z
    .array(
      z.object({
        filingYear: z.string().regex(fyRe),
        toYear: z.string().regex(fyRe).nullable(),
        percent: z.number().min(0).max(100),
        baseYear: z.string().regex(fyRe).nullable(),
        baseRule: z.string(),
      }),
    )
    .min(1),
  importedUsedEeePercent: z.number().min(0).max(100),
  notApplicableCodes: z.array(z.string().regex(CODE_RE)),
});
const goldSchema = z.array(z.object({ filingYear: z.string().regex(fyRe), percent: z.number().min(0).max(100) })).min(1);

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  const schedule = await scheduleI();
  const codes = schedule.map(s => s.code);
  const [tg, comp, gold, life] = await Promise.all([targets(), composition(), goldPhaseIn(), averageLife(codes)]);

  const items: z.infer<typeof itemSchema>[] = [];
  for (const s of schedule) {
    const l = life.find(x => x.code === s.code);
    if (!l) continue;
    const base = { code: s.code, category: s.category, name: s.name, averageLifeSource: l.source, averageLifeStatus: l.source === "lifeDraft" ? "draft" : "final", targetsApply: !tg.notApplicableCodes.includes(s.code) } as const;
    if (!l.variants.length) {
      items.push({ ...base, id: s.code, variant: null, averageLifeYears: l.years!, compositionVariant: null });
      continue;
    }
    for (const v of l.variants) {
      // ITEW15 is the only code with separate Annexure I rows: feature phones (F.P) and smart phones (S.P).
      const compositionVariant = s.code === "ITEW15" ? (v.label === "Feature phones" ? "F.P" : "S.P") : null;
      items.push({ ...base, id: `${s.code}-${slug(v.label)}`, variant: v.label, averageLifeYears: v.years, compositionVariant });
    }
  }

  // Validation
  z.array(itemSchema).parse(items);
  z.array(compositionSchema).parse(comp);
  targetsSchema.parse(tg);
  goldSchema.parse(gold);
  const problems: string[] = [...missing];
  const dupIds = items.map(i => i.id).filter((id, i, a) => a.indexOf(id) !== i);
  if (dupIds.length) problems.push(`Duplicate item ids: ${dupIds.join(", ")}`);
  const dupCodes = codes.filter((c, i, a) => a.indexOf(c) !== i);
  if (dupCodes.length) problems.push(`Duplicate codes in Schedule I: ${dupCodes.join(", ")}`);
  if (codes.length !== 106) problems.push(`Schedule I has ${codes.length} codes; CPCB states 106`);
  for (const i of items) {
    if (!comp.some(c => c.code === i.code && c.variant === i.compositionVariant)) problems.push(`No Annexure I row for ${i.id}`);
  }
  for (const c of comp) if (!codes.includes(c.code)) problems.push(`Annexure I code ${c.code} is not in Schedule I`);

  // Cross-checks from the brief. A mismatch is reported, never silently changed.
  const notes: string[] = [];
  const ac = items.find(i => i.code === "CEEW4");
  const acComp = comp.find(c => c.code === "CEEW4");
  const expectAc = { life: 10, au: null, cu: "7.5", fe: "45", al: "8.4" };
  if (ac?.averageLifeYears !== expectAc.life || acComp?.au !== expectAc.au || acComp?.cu !== expectAc.cu || acComp?.fe !== expectAc.fe || acComp?.al !== expectAc.al) {
    problems.push(`CEEW4 cross-check failed: ${JSON.stringify({ life: ac?.averageLifeYears, ...acComp })}`);
  }
  const sp = comp.find(c => c.code === "ITEW15" && c.variant === "S.P");
  if (sp?.cu !== "3" || sp?.fe !== "3" || sp?.al !== "7.97") problems.push(`ITEW15 (S.P) cross-check failed: ${JSON.stringify(sp)}`);
  if (sp?.au !== "0.0016") {
    notes.push(
      `ITEW15 smart phones: Annexure I gives Au ${sp?.au}%, while the published worked example uses 0.0016% (the same figure rounded). The notice value is used.`,
    );
  }
  const secondaryGold = [20, 30, 45, 45, 60, 80, 100];
  if (gold.map(g => g.percent).join() !== secondaryGold.slice(0, gold.length).join()) {
    notes.push(
      `Gold phase-in: the notice gives ${gold.map(g => `${g.percent}% (${g.filingYear})`).join(", ")}, then 100% onwards. A secondary source listed 45% twice and 100% only from 2029-30. The notice is used.`,
    );
  }
  const draftCount = new Set(items.filter(i => i.averageLifeStatus === "draft").map(i => i.code)).size;
  notes.push(
    `Average life: ${draftCount} EEE codes use CPCB's draft list of 21 March 2023 (no final list was found on cpcb.nic.in, cpcb.gov.in or eprewaste.cpcb.gov.in). The other ${codes.length - draftCount} use the 2016 CPCB guidelines.`,
  );
  if (tg.notApplicableCodes.length) notes.push(`No recycling target applies to ${tg.notApplicableCodes.join(", ")} (solar PV) under Schedule III note (3) and Schedule IV note (2).`);

  // Confirmed-rule check: the Gazette values must match the CPCB FAQ wording in the brief.
  const faqText = (await pages("faq")).map(pageText).join(" ").replace(/\s+/g, " ");
  if (!/60% of the quantity of waste generation, followed by 70% during FY 2025-26 & FY 2026-27, 80% during FY 2027-28 and onwards/.test(faqText)) problems.push("CPCB FAQ wording for Schedule III targets not found");
  if (!/15% of sale in 2021-22 and for FY 2024-25 it is 20% of sale in FY 2022- ?23, and for FY 2025-2026 onwards it is 20% of the sales figure of the financial year two years back/.test(faqText)) problems.push("CPCB FAQ wording for Schedule IV targets not found");

  if (problems.length) {
    console.error("\nEPR data NOT written. Problems:\n" + problems.map(p => `  - ${p}`).join("\n"));
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const meta = {
    extractedAt: today,
    sources: Object.entries(SOURCES).map(([key, s]) => ({
      key,
      ...s,
      sha256: createHash("sha256").update(readFileSync(path.join(REF, s.file))).digest("hex"),
    })),
    notes,
  };
  const files: Record<string, unknown> = {
    "eee-items.json": items,
    "metal-composition.json": comp,
    "targets.json": tg,
    "gold-phase-in.json": gold,
  };
  const stable = (v: unknown) => JSON.stringify(v, null, 2) + "\n";
  let changed = 0;
  mkdirSync(OUT, { recursive: true });
  for (const [name, data] of Object.entries(files)) {
    const file = path.join(OUT, name);
    let prev = "";
    try {
      prev = readFileSync(file, "utf8");
    } catch {}
    if (prev !== stable(data)) {
      changed++;
      if (!CHECK_ONLY) writeFileSync(file, stable(data));
      console.log(`${CHECK_ONLY ? "differs" : "wrote"}  ${name}`);
    } else console.log(`same    ${name}`);
  }
  // meta.json changes date on every run; only rewrite it when the data changed or it is missing.
  const metaFile = path.join(OUT, "meta.json");
  let metaPrev: { extractedAt?: string } | null = null;
  try {
    metaPrev = JSON.parse(readFileSync(metaFile, "utf8"));
  } catch {}
  if (!CHECK_ONLY && (changed || !metaPrev)) writeFileSync(metaFile, stable(meta));
  else if (!CHECK_ONLY && metaPrev?.extractedAt) writeFileSync(metaFile, stable({ ...meta, extractedAt: metaPrev.extractedAt }));

  console.log(`\n${codes.length} codes, ${items.length} selectable items (${items.filter(i => i.variant).length} sub-types), ${comp.length} composition rows.`);
  for (const n of notes) console.log(`note: ${n}`);
  if (CHECK_ONLY && changed) process.exit(1);
}

main().catch(err => {
  console.error(err instanceof ExtractionError ? `\n${err.message}` : err);
  process.exit(1);
});

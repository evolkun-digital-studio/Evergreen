/** Branded PDF of a calculation (continues onto a second page when needed). Loaded on demand, so jsPDF stays out of the page bundle. */
import { jsPDF } from "jspdf";
import { site } from "@/config/site";
import type { CalcInput, Target } from "@/lib/epr/calculate";
import { eprData, regulatoryStatus } from "@/lib/epr/data";
import { DISCLAIMER, buildSummary } from "@/lib/epr/summary";

const EVERGREEN_950: [number, number, number] = [10, 38, 22];
const EVERGREEN_700: [number, number, number] = [26, 107, 55];
const MOSS: [number, number, number] = [182, 212, 51];
const INK: [number, number, number] = [16, 38, 28];
const MUTED: [number, number, number] = [75, 94, 83];

async function loadBrandLogo() {
  const response = await fetch(site.logo);
  if (!response.ok) throw new Error("Could not load the Evergreen logo for the PDF.");
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the Evergreen logo."));
    reader.readAsDataURL(blob);
  });
}

// jsPDF's built-in Helvetica has no icon glyphs, so the contact icons are drawn as vector shapes (10pt box).
function drawGlobeIcon(doc: jsPDF, cx: number, cy: number) {
  const r = 5;
  doc.setDrawColor(...EVERGREEN_700);
  doc.setLineWidth(0.8);
  doc.circle(cx, cy, r, "S");
  doc.ellipse(cx, cy, 2.2, r, "S");
  doc.line(cx - r, cy, cx + r, cy);
  doc.line(cx - 4.1, cy - 2.5, cx + 4.1, cy - 2.5);
  doc.line(cx - 4.1, cy + 2.5, cx + 4.1, cy + 2.5);
}

function drawPhoneIcon(doc: jsPDF, cx: number, cy: number) {
  doc.setDrawColor(...EVERGREEN_700);
  doc.setFillColor(...EVERGREEN_700);
  doc.setLineWidth(0.8);
  doc.roundedRect(cx - 3.2, cy - 5, 6.4, 10, 1.4, 1.4, "S");
  doc.line(cx - 1.2, cy - 3.3, cx + 1.2, cy - 3.3);
  doc.circle(cx, cy + 3.1, 0.55, "F");
}

/**
 * jsPDF's built-in Helvetica only encodes WinAnsi: "−" (U+2212) and "≥" garble the whole line. "×"
 * and "–" are in WinAnsi and stay.
 */
const pdfSafe = (t: string) => t.replace(/−/g, "-").replace(/≥/g, ">=").replace(/≤/g, "<=");

export async function downloadPdf(input: CalcInput, r: Target, url: string) {
  const raw = buildSummary(input, r);
  const pair = ([k, v]: [string, string]): [string, string] => [pdfSafe(k), pdfSafe(v)];
  const s = {
    ...raw,
    inputs: raw.inputs.map(pair),
    results: raw.results.map(pair),
    basis: raw.basis.map(pair),
    steps: raw.steps.map(pdfSafe),
    notes: raw.notes.map(pdfSafe),
  };
  const logo = await loadBrandLogo();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = 0;
  /** Starts a new page when the next `h` points would run past the bottom margin. */
  const room = (h: number) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };

  // Branded header
  doc.setFillColor(248, 250, 248);
  doc.rect(0, 0, W, 92, "F");
  doc.addImage(logo, "PNG", M, 17, 168, 43);
  doc.setFillColor(...MOSS);
  doc.rect(M, 78, W - 2 * M, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const ICON = 10;
  const ICON_GAP = 7;
  const contactLine = (text: string, baseline: number, color: [number, number, number], icon: typeof drawGlobeIcon) => {
    doc.setTextColor(...color);
    doc.text(text, W - M, baseline, { align: "right" });
    icon(doc, W - M - doc.getTextWidth(text) - ICON_GAP - ICON / 2, baseline - 3.4);
    doc.setLineWidth(0.2);
  };
  contactLine(new URL(site.domain).host, 35, EVERGREEN_950, drawGlobeIcon);
  contactLine(site.phone, 52, MUTED, drawPhoneIcon);
  y = 126;

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("E-waste EPR estimate", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  y += 16;
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`E-Waste (Management) Rules, 2022  ·  Prepared ${date}`, M, y);
  y += 26;

  const section = (title: string) => {
    room(60);
    doc.setTextColor(...EVERGREEN_700);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), M, y);
    y += 8;
    doc.setDrawColor(220, 226, 222);
    doc.line(M, y, W - M, y);
    y += 16;
  };
  const VALUE_X = 250;
  const rows = (pairs: [string, string][]) => {
    doc.setFontSize(10.5);
    for (const [k, v] of pairs) {
      // Both columns wrap; the taller one sets the row height, checked before drawing so a label
      // never lands on a different page from its value.
      doc.setFont("helvetica", "normal");
      const keyLines = doc.splitTextToSize(k, VALUE_X - M - 14) as string[];
      doc.setFont("helvetica", "bold");
      const valueLines = doc.splitTextToSize(v, W - M - VALUE_X) as string[];
      const height = 15 * Math.max(keyLines.length, valueLines.length);
      room(height);
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "normal");
      doc.text(keyLines, M, y);
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.text(valueLines, VALUE_X, y);
      y += height + 3;
    }
    y += 10;
  };

  section("Inputs");
  rows(s.inputs);
  section("Results");
  rows(s.results);
  section("Legal basis and formula");
  rows(s.basis);

  section("How this was calculated");
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...INK);
  s.steps.forEach((step, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${step}`, W - 2 * M) as string[];
    room(13 * lines.length);
    doc.text(lines, M, y);
    y += 13 * lines.length + 3;
  });
  y += 10;

  section("Key metals for EPR certificates (part of the target)");
  const cols = [M, 250, 360, W - M];
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  ["Metal", "Composition", "Phase-in", "Quantity"].forEach((h, i) => doc.text(h, cols[i], y, i === 3 ? { align: "right" } : undefined));
  y += 16;
  doc.setFontSize(10.5);
  for (const [m, c, p, q] of s.metals) {
    room(16);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "normal");
    doc.text(m, cols[0], y);
    doc.text(c, cols[1], y);
    doc.text(p, cols[2], y);
    doc.setFont("helvetica", "bold");
    doc.text(q, cols[3], y, { align: "right" });
    y += 16;
  }
  y += 10;

  if (s.notes.length) {
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    for (const n of s.notes) {
      const lines = doc.splitTextToSize(n, W - 2 * M) as string[];
      room(12 * lines.length);
      doc.text(lines, M, y);
      y += 12 * lines.length + 2;
    }
    y += 8;
  }

  section("Sources");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  const sources = eprData.meta.sources.filter(x => !x.key.startsWith("amendment") && x.key !== "portalFaq");
  for (const src of sources) {
    const lines = doc.splitTextToSize(`${src.issuer}, ${src.title} (${src.date}).`, W - 2 * M) as string[];
    room(11 * lines.length);
    doc.text(lines, M, y);
    y += 11 * lines.length + 3;
  }
  {
    const lines = doc.splitTextToSize(`${regulatoryStatus.regulation}. Regulatory data last verified ${regulatoryStatus.lastVerified}.`, W - 2 * M) as string[];
    doc.text(lines, M, y);
    y += 11 * lines.length + 3;
  }
  y += 6;
  room(60);
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.text(doc.splitTextToSize(DISCLAIMER, W - 2 * M) as string[], M, y);
  y += 24;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...EVERGREEN_700);
  doc.textWithLink("Open this calculation online", M, y, { url });

  doc.save(`epr-estimate-${r.item.id}-${r.filingYear}.pdf`);
}

/** One-page branded PDF of a calculation. Loaded on demand, so jsPDF stays out of the page bundle. */
import { jsPDF } from "jspdf";
import { site } from "@/config/site";
import type { CalcInput, CalcResult } from "@/lib/epr/calculate";
import { eprData } from "@/lib/epr/data";
import { DISCLAIMER, buildSummary } from "@/lib/epr/summary";

const EVERGREEN_950: [number, number, number] = [10, 38, 22];
const EVERGREEN_700: [number, number, number] = [26, 107, 55];
const MOSS: [number, number, number] = [182, 212, 51];
const INK: [number, number, number] = [16, 38, 28];
const MUTED: [number, number, number] = [75, 94, 83];

export async function downloadPdf(input: CalcInput, r: Extract<CalcResult, { kind: "target" }>, url: string) {
  const s = buildSummary(input, r);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = 0;

  // Header band
  doc.setFillColor(...EVERGREEN_950);
  doc.rect(0, 0, W, 86, "F");
  doc.setFillColor(...MOSS);
  doc.rect(M, 70, 64, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(site.name, M, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(site.legalName, M, 60);
  doc.text(new URL(site.domain).host, W - M, 44, { align: "right" });
  y = 122;

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
    doc.setTextColor(...EVERGREEN_700);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), M, y);
    y += 8;
    doc.setDrawColor(220, 226, 222);
    doc.line(M, y, W - M, y);
    y += 16;
  };
  const rows = (pairs: [string, string][]) => {
    doc.setFontSize(10.5);
    for (const [k, v] of pairs) {
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "normal");
      doc.text(k, M, y);
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      const lines = doc.splitTextToSize(v, W - M - 250) as string[];
      doc.text(lines, 250, y);
      y += 15 * lines.length + 3;
    }
    y += 10;
  };

  section("Inputs");
  rows(s.inputs);
  section("Results");
  rows(s.results);

  section("Metal recovery obligation");
  const cols = [M, 250, 360, W - M];
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  ["Metal", "Composition", "Phase-in", "Quantity"].forEach((h, i) => doc.text(h, cols[i], y, i === 3 ? { align: "right" } : undefined));
  y += 16;
  doc.setFontSize(10.5);
  for (const [m, c, p, q] of s.metals) {
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
    doc.text(lines, M, y);
    y += 11 * lines.length + 3;
  }
  y += 6;
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.text(doc.splitTextToSize(DISCLAIMER, W - 2 * M) as string[], M, y);
  y += 24;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...EVERGREEN_700);
  doc.textWithLink("Open this calculation online", M, y, { url });

  doc.save(`epr-estimate-${r.item.code}-${input.filingYear}.pdf`);
}

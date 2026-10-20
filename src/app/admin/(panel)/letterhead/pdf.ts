"use client";

import { jsPDF } from "jspdf";
import type { CompanyBrand, LetterheadDraft } from "@/lib/letterhead/types";
import { formatLetterDate } from "./LetterDocument";

const COLORS = { dark: [10, 38, 22] as const, green: [26, 107, 55] as const, ink: [16, 38, 28] as const, muted: [75, 94, 83] as const, line: [218, 226, 220] as const };
const PAGE_MARGIN = 56;
const HEADER_LINE_Y = 86;
const CONTENT_START_Y = 112;
type PdfImage = { data: string; format: "PNG" | "JPEG"; width: number; height: number };

async function imageData(url: string): Promise<PdfImage | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.type === "image/webp") {
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();
      return await new Promise<PdfImage>((resolve, reject) => {
        image.onload = () => { const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; canvas.getContext("2d")?.drawImage(image, 0, 0); URL.revokeObjectURL(objectUrl); resolve({ data: canvas.toDataURL("image/png"), format: "PNG", width: image.naturalWidth, height: image.naturalHeight }); };
        image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Could not read WebP image")); };
        image.src = objectUrl;
      });
    }
    return await new Promise<PdfImage>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { const data = String(reader.result); const image = new Image(); image.onload = () => resolve({ data, format: blob.type === "image/png" ? "PNG" : "JPEG", width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => reject(new Error("Could not read image")); image.src = data; };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addImageContained(doc: jsPDF, image: PdfImage, x: number, y: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  doc.addImage(image.data, image.format, x + (maxWidth - width) / 2, y + (maxHeight - height) / 2, width, height, undefined, "FAST");
  return { width, height };
}

function textBlocks(html: string) {
  const source = html.replace(/<br\s*\/?\s*>/gi, "\n");
  return [...source.matchAll(/<(p|h[1-3]|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => {
    const text = match[2].replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
    const openingTag = match[0].match(/^<[^>]+>/)?.[0] ?? "";
    const rawAlign = openingTag.match(/text-align\s*:\s*(left|center|right|justify)/i)?.[1]?.toLowerCase();
    const align: "left" | "center" | "right" = rawAlign === "center" || rawAlign === "right" ? rawAlign : "left";
    return { text: match[1].toLowerCase() === "li" ? `• ${text}` : text, size: /^h/i.test(match[1]) ? 12 : 10.5, bold: /^h/i.test(match[1]), align };
  }).filter((block) => block.text);
}

function drawContactIcon(doc: jsPDF, type: "website" | "email" | "phone", x: number, y: number) {
  doc.setDrawColor(...COLORS.muted);
  doc.setLineWidth(0.65);
  if (type === "website") {
    doc.circle(x + 4, y + 4, 3);
    doc.line(x + 1, y + 4, x + 7, y + 4);
    doc.line(x + 4, y + 1, x + 4, y + 7);
    return;
  }
  if (type === "email") {
    doc.rect(x, y + 1, 8, 6);
    doc.line(x, y + 1, x + 4, y + 4);
    doc.line(x + 8, y + 1, x + 4, y + 4);
    return;
  }
  doc.line(x + 2, y + 1, x + 1, y + 2);
  doc.line(x + 1, y + 2, x + 2, y + 5);
  doc.line(x + 2, y + 5, x + 5, y + 7);
  doc.line(x + 5, y + 7, x + 7, y + 6);
  doc.line(x + 7, y + 6, x + 6, y + 4);
  doc.line(x + 6, y + 4, x + 5, y + 5);
  doc.line(x + 5, y + 5, x + 3, y + 3);
  doc.line(x + 3, y + 3, x + 4, y + 2);
  doc.line(x + 4, y + 2, x + 2, y + 1);
}

function drawHeader(doc: jsPDF, company: CompanyBrand, draft: LetterheadDraft, logo: PdfImage | null) {
  const W = doc.internal.pageSize.getWidth();
  const M = PAGE_MARGIN;
  // The source is a wide wordmark: target a compact 50px visual height without stretching it.
  if (logo) addImageContained(doc, logo, M, 24, 200, 38);
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  [
    { value: company.website.replace(/^https?:\/\//, ""), type: "website" as const },
    { value: company.email, type: "email" as const },
    { value: company.phone, type: "phone" as const },
  ].filter((item) => item.value).forEach(({ value, type }, index) => {
    const baseline = 38 + index * 11;
    doc.text(value, W - M, baseline, { align: "right" });
    drawContactIcon(doc, type, W - M - doc.getTextWidth(value) - 12, baseline - 7);
  });
  doc.setDrawColor(...COLORS.green);
  doc.setLineWidth(2);
  doc.line(M, HEADER_LINE_Y, W - M, HEADER_LINE_Y);
}

function drawFooter(doc: jsPDF, company: CompanyBrand, page: number, count: number) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = PAGE_MARGIN;
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.6);
  doc.line(M, H - 58, W - M, H - 58);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(company.address, M, H - 42);
  doc.text([company.website.replace(/^https?:\/\//, ""), company.email, company.phone, company.alternatePhone].filter(Boolean).join("  ·  "), M, H - 29);
  if (count > 1) doc.text(`Page ${page} of ${count}`, W - M, H - 29, { align: "right" });
}

export async function downloadLetterheadPdf(draft: LetterheadDraft, company: CompanyBrand, bodyPages: string[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = PAGE_MARGIN;
  const logo = await imageData(company.logoUrl || "/brand/evergreen-logo.png");
  const signature = draft.signatureUrl ? await imageData(draft.signatureUrl) : null;

  bodyPages.forEach((bodyHtml, pageIndex) => {
    if (pageIndex) doc.addPage();
    drawHeader(doc, company, draft, logo);
    if (logo) {
      const pdf = doc as unknown as { GState?: new (options: { opacity: number }) => unknown; setGState?: (value: unknown) => void };
      if (pdf.GState && pdf.setGState) pdf.setGState(new pdf.GState({ opacity: 0.06 }));
      addImageContained(doc, logo, (W - 190) / 2, (H - 190) / 2 - 20, 190, 190);
      if (pdf.GState && pdf.setGState) pdf.setGState(new pdf.GState({ opacity: 1 }));
    }
    let y = CONTENT_START_Y;
    if (pageIndex === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(...COLORS.ink);
      if (draft.date || draft.referenceNumber) {
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.muted);
        doc.text([formatLetterDate(draft.date), draft.referenceNumber ? `Ref. ${draft.referenceNumber}` : ""].filter(Boolean).join("  ·  "), W - M, y, { align: "right" });
        y += 22;
        doc.setFontSize(10.5);
        doc.setTextColor(...COLORS.ink);
      }
      if (draft.recipientName || draft.recipientAddress) { doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.green); doc.text("To", M, y); y += 15; }
      if (draft.recipientName) { doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.ink); doc.text(draft.recipientName, M, y); y += 15; }
      if (draft.recipientAddress) { doc.setFont("helvetica", "normal"); for (const line of draft.recipientAddress.split("\n").filter(Boolean)) { doc.text(line, M, y); y += 13; } y += 12; }
      if (draft.subject) { doc.setFont("helvetica", "bold"); doc.text(`Subject: ${draft.subject}`, M, y); y += 25; }
      if (!draft.recipientName && !draft.recipientAddress && !draft.subject) y += 14;
    } else y = CONTENT_START_Y;
    doc.setFont("helvetica", "normal");
    for (const block of textBlocks(bodyHtml)) {
      doc.setFont("helvetica", block.bold ? "bold" : "normal");
      doc.setFontSize(block.size);
      doc.setTextColor(...COLORS.ink);
      const lines = doc.splitTextToSize(block.text, W - 2 * M) as string[];
      const x = block.align === "center" ? W / 2 : block.align === "right" ? W - M : M;
      doc.text(lines, x, y, { align: block.align, lineHeightFactor: 1.55 });
      y += lines.length * block.size * 1.55 + (draft.paragraphSpacing ?? 12);
    }
    if (pageIndex === bodyPages.length - 1) {
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.text(draft.closing || "Sincerely,", M, y);
      y += 18;
      if (signature) { const fitted = addImageContained(doc, signature, M, y, draft.signatureWidth ?? 150, 54); y += fitted.height + 8; }
      if (draft.authorizedName) { doc.setFont("helvetica", "bold"); doc.text(draft.authorizedName, M, y); y += 14; }
      if (draft.designation) { doc.setFont("helvetica", "normal"); doc.text(draft.designation, M, y); }
    }
    drawFooter(doc, company, pageIndex + 1, bodyPages.length);
    doc.setProperties({ title: draft.name || "Evergreen letter", subject: draft.subject || "Company letter", author: company.name });
  });
  const filename = `${(draft.name || "evergreen-letter").trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "evergreen-letter"}.pdf`;
  doc.save(filename);
}

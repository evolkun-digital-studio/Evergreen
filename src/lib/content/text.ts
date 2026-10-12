import { NODES, type PMNode } from "./types";

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "listItem",
  "blockquote",
  "codeBlock",
  "tableCell",
  "tableHeader",
  NODES.callout,
]);

/** Plain-text copy of the document: one block per line, used for search, word count and scoring. */
export function docToText(doc: PMNode, extra?: { keyTakeaways?: string[]; faqs?: { question: string; answer: string }[] }): string {
  const lines: string[] = [];
  const visit = (node: PMNode): string => {
    if (node.type === "text") return node.text ?? "";
    if (node.type === "hardBreak") return "\n";
    if (node.type === NODES.expertQuote) {
      const a = node.attrs ?? {};
      lines.push(`${a.quote ?? ""} — ${a.name ?? ""}${a.role ? `, ${a.role}` : ""}`.trim());
      return "";
    }
    if (node.type === NODES.keyTakeaways && extra?.keyTakeaways) {
      lines.push(...extra.keyTakeaways);
      return "";
    }
    if (node.type === NODES.faq && extra?.faqs) {
      for (const f of extra.faqs) lines.push(f.question, f.answer);
      return "";
    }
    if (node.type === "image") {
      if (node.attrs?.caption) lines.push(String(node.attrs.caption));
      return "";
    }
    const inner = (node.content ?? []).map(visit).join("");
    if (BLOCK_TYPES.has(node.type)) {
      if (inner.trim()) lines.push(inner.trim());
      return "";
    }
    return inner;
  };
  const rest = visit(doc);
  if (rest.trim()) lines.push(rest.trim());
  return lines.join("\n");
}

export function countWords(text: string): number {
  const words = text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu);
  return words ? words.length : 0;
}

/** 220 words per minute, minimum one minute for any non-empty article. */
export function readingTimeMinutes(wordCount: number): number {
  return wordCount ? Math.max(1, Math.round(wordCount / 220)) : 0;
}

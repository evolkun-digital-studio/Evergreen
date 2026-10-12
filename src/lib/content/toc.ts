import { slugify } from "@/lib/slug";
import type { PMNode } from "./types";

export type Heading = { id: string; text: string; level: 2 | 3 | 4 };
export type TocItem = Heading & { children: TocItem[] };

export function nodeText(node: PMNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return " ";
  return (node.content ?? []).map(nodeText).join("");
}

/** Clamps editor/markdown heading levels into the article's H2–H4 range (H1 is the title). */
export function clampHeadingLevel(level: unknown): 2 | 3 | 4 {
  const n = Number(level);
  if (!Number.isFinite(n) || n <= 2) return 2;
  if (n >= 4) return 4;
  return 3;
}

/**
 * Collects H2–H4 headings in document order with stable, unique ids. The same function is
 * used by the renderer (to put ids on the headings) and by the TOC, so anchors always match.
 */
export function extractHeadings(doc: PMNode): Heading[] {
  const headings: Heading[] = [];
  const used = new Map<string, number>();
  const visit = (node: PMNode) => {
    if (node.type === "heading") {
      const text = nodeText(node).replace(/\s+/g, " ").trim();
      if (text) {
        const base = slugify(text, { maxLength: 60 }) || "section";
        const seen = used.get(base) ?? 0;
        used.set(base, seen + 1);
        headings.push({ id: seen ? `${base}-${seen + 1}` : base, text, level: clampHeadingLevel(node.attrs?.level) });
      }
      return;
    }
    node.content?.forEach(visit);
  };
  visit(doc);
  return headings;
}

/** Nests a flat heading list; a deeper heading with no parent attaches to the nearest shallower one. */
export function buildTocTree(headings: Heading[]): TocItem[] {
  const root: TocItem[] = [];
  const stack: TocItem[] = [];
  for (const h of headings) {
    const item: TocItem = { ...h, children: [] };
    while (stack.length && stack[stack.length - 1].level >= item.level) stack.pop();
    (stack.length ? stack[stack.length - 1].children : root).push(item);
    stack.push(item);
  }
  return root;
}

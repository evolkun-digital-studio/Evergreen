// One pass over the Tiptap document collecting the facts the scorers need. Pure and client-safe.
import { extractHeadings, nodeText, clampHeadingLevel } from "@/lib/content/toc";
import { NODES, youtubeId, type PMNode } from "@/lib/content/types";
import { countWords, docToText } from "@/lib/content/text";
import { SITE_URL } from "@/lib/cms/constants";

export type DocLink = { href: string; text: string; internal: boolean };
export type DocImage = { alt: string; src: string };
export type DocHeading = { level: 2 | 3 | 4; text: string };
export type DocParagraph = { text: string; words: number; afterHeading: DocHeading | null };

export type DocAnalysis = {
  text: string;
  wordCount: number;
  headings: DocHeading[];
  paragraphs: DocParagraph[];
  links: DocLink[];
  images: DocImage[];
  hasList: boolean;
  hasTable: boolean;
  expertQuotes: number;
  videos: number;
  hasFaqBlock: boolean;
  hasTakeawaysBlock: boolean;
  /** Heading levels in order (H1 = the title is implied), for skipped-level checks. */
  headingLevels: number[];
  /** Words between consecutive headings (and before the first one). */
  sectionWordCounts: number[];
};

const siteHost = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "";
  }
})();

function isInternal(href: string): boolean {
  if (href.startsWith("/") || href.startsWith("#")) return true;
  try {
    return new URL(href).host === siteHost;
  } catch {
    return false;
  }
}

export function analyzeDoc(doc: PMNode, extra?: { keyTakeaways?: string[]; faqs?: { question: string; answer: string }[] }): DocAnalysis {
  const a: DocAnalysis = {
    text: docToText(doc, extra),
    wordCount: 0,
    headings: extractHeadings(doc).map((h) => ({ level: h.level, text: h.text })),
    paragraphs: [],
    links: [],
    images: [],
    hasList: false,
    hasTable: false,
    expertQuotes: 0,
    videos: 0,
    hasFaqBlock: false,
    hasTakeawaysBlock: false,
    headingLevels: [],
    sectionWordCounts: [0],
  };
  a.wordCount = countWords(a.text);

  let lastHeading: DocHeading | null = null;
  let firstParagraphAfterHeading = false;

  const visit = (node: PMNode) => {
    switch (node.type) {
      case "heading": {
        const text = nodeText(node).trim();
        if (text) {
          lastHeading = { level: clampHeadingLevel(node.attrs?.level), text };
          a.headingLevels.push(lastHeading.level);
          a.sectionWordCounts.push(0);
          firstParagraphAfterHeading = true;
        }
        return;
      }
      case "paragraph": {
        const text = nodeText(node).trim();
        if (text) {
          const words = countWords(text);
          a.paragraphs.push({ text, words, afterHeading: firstParagraphAfterHeading ? lastHeading : null });
          a.sectionWordCounts[a.sectionWordCounts.length - 1] += words;
          firstParagraphAfterHeading = false;
        }
        break;
      }
      case "bulletList":
      case "orderedList":
        a.hasList = true;
        break;
      case "table":
        a.hasTable = true;
        break;
      case "image":
        a.images.push({ alt: String(node.attrs?.alt ?? "").trim(), src: String(node.attrs?.src ?? "") });
        return;
      case NODES.expertQuote:
        if (String(node.attrs?.quote ?? "").trim()) a.expertQuotes++;
        return;
      case NODES.videoEmbed:
        if (youtubeId(String(node.attrs?.url ?? ""))) a.videos++;
        return;
      case NODES.faq:
        a.hasFaqBlock = true;
        return;
      case NODES.keyTakeaways:
        a.hasTakeawaysBlock = true;
        return;
      case "text":
        for (const m of node.marks ?? []) {
          if (m.type === "link" && m.attrs?.href) {
            const href = String(m.attrs.href);
            if (!/^(mailto|tel):/i.test(href) && !href.startsWith("#")) a.links.push({ href, text: node.text ?? "", internal: isInternal(href) });
          }
        }
        return;
    }
    node.content?.forEach(visit);
  };
  visit(doc);
  // A link split across text nodes (e.g. partly bold) produces consecutive entries: count it once.
  a.links = a.links.filter((l, i, arr) => i === 0 || arr[i - 1].href !== l.href);
  return a;
}

/**
 * Keeps the browser preview and the PDF exporter on the same deterministic page model.
 * The editor writes block-level HTML, so page breaks are made between blocks where possible.
 */
export function safeLetterBodyHtml(html: string): string {
  return html
    .replace(/<\/?(?:script|style|iframe|object|embed|form|input|textarea|button)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(?:href|src)\s*=\s*["']\s*javascript:[^"']*["']/gi, "");
}

function textLength(html: string) {
  return html
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim().length;
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function splitLongBlock(block: string, limit: number): string[] {
  const tag = block.match(/^<(p|div|h[1-3])\b[^>]*>/i)?.[1] ?? "p";
  const inner = block.replace(/^<[^>]+>/, "").replace(/<\/[^>]+>\s*$/i, "");
  const words = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > limit) {
      chunks.push(`<${tag}>${escapeHtml(current)}</${tag}>`);
      current = word;
    } else current = next;
  }
  if (current) chunks.push(`<${tag}>${escapeHtml(current)}</${tag}>`);
  return chunks.length ? chunks : [`<${tag}></${tag}>`];
}

export function paginateBodyHtml(html: string, firstLimit = 1750, nextLimit = 2450): string[] {
  const clean = safeLetterBodyHtml(html || "<p></p>");
  const blocks = clean.match(/<(p|div|h[1-3]|ul|ol|blockquote)\b[^>]*>[\s\S]*?<\/\1>|<br\s*\/?\s*>/gi) ?? [clean];
  const expanded = blocks.flatMap((block) => textLength(block) > nextLimit ? splitLongBlock(block, nextLimit) : [block]);
  const pages: string[] = [];
  let current = "";
  let limit = firstLimit;
  for (const block of expanded) {
    const next = current ? `${current}${block}` : block;
    if (current && textLength(next) > limit) {
      pages.push(current);
      current = block;
      limit = nextLimit;
    } else current = next;
  }
  if (current || !pages.length) pages.push(current || "<p></p>");
  return pages;
}

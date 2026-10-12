// Client-safe slug helpers shared by the editor (live preview) and the server (validation).

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "is", "it",
  "of", "on", "or", "that", "the", "this", "to", "was", "what", "when", "where", "which",
  "who", "why", "with", "your", "you",
]);

type SlugOptions = { removeStopWords?: boolean; maxLength?: number };

export function slugify(input: string, { removeStopWords = false, maxLength = 80 }: SlugOptions = {}): string {
  let words = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (removeStopWords) {
    const kept = words.filter((w) => !STOP_WORDS.has(w));
    if (kept.length) words = kept;
  }

  let slug = words.join("-");
  if (slug.length > maxLength) {
    const cutOnBoundary = slug[maxLength] === "-";
    slug = slug.slice(0, maxLength);
    const lastDash = slug.lastIndexOf("-");
    if (!cutOnBoundary && lastDash > maxLength * 0.6) slug = slug.slice(0, lastDash);
  }
  return slug.replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && slug.length <= 120;
}

/** Appends -2, -3… until `exists` returns false. */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const root = base || "untitled";
  let candidate = root;
  for (let i = 2; await exists(candidate); i++) candidate = `${root}-${i}`;
  return candidate;
}
